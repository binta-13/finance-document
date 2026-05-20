import { json } from '@sveltejs/kit';

interface VisionLineItem {
	description: string | null;
	quantity: number | null;
	unit_price: number | null;
	amount: number | null;
}

interface VisionResult {
	vendor: string | null;
	date: string | null;
	total: number | null;
	currency: string | null;
	line_items: VisionLineItem[];
}

async function fetchImageAsBase64(url: string): Promise<string> {
	const res = await fetch(url);
	if (!res.ok) throw new Error(`Failed to fetch image: ${res.status}`);
	const buf = await res.arrayBuffer();
	const base64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
	const mime = res.headers.get('content-type') ?? 'image/png';
	return `data:${mime};base64,${base64}`;
}

async function callVisionModel(apiKey: string, imageDataUrl: string): Promise<VisionResult> {
	const models = ['openai/gpt-4o', 'google/gemini-2.0-flash-001'];

	for (const model of models) {
		const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
			method: 'POST',
			headers: {
				'Authorization': `Bearer ${apiKey}`,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				model,
				messages: [{
					role: 'user',
					content: [
						{ type: 'text', text: `Extract invoice/receipt data from this image. Return ONLY valid JSON with this structure:
{
  "vendor": "store name or null",
  "date": "YYYY-MM-DD or null",
  "total": 123.45 or null,
  "currency": "USD/IDR/EUR or null",
  "line_items": [
    {"description": "item name", "quantity": 1, "unit_price": 10.00, "amount": 10.00}
  ]
}
If line items are not clearly listed, return an empty array. Use null for any field you cannot determine.` },
						{ type: 'image_url', image_url: { url: imageDataUrl } }
					]
				}],
				max_tokens: 2000,
				temperature: 0.1
			})
		});

		if (!response.ok) {
			const errText = await response.text();
			console.error(`OpenRouter ${model} failed:`, errText);
			continue;
		}

		const aiData = await response.json();
		const content = aiData.choices?.[0]?.message?.content;
		if (!content) continue;

		let jsonStr = content;
		const codeMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
		if (codeMatch) jsonStr = codeMatch[1];

		return JSON.parse(jsonStr) as VisionResult;
	}

	throw new Error('All OpenRouter vision models failed');
}

export async function POST({ params, platform }) {
	const env = platform?.env;
	if (!env) return json({ error: 'Platform env not available' }, { status: 500 });
	if (!env.DB) return json({ error: 'D1 database binding not available' }, { status: 500 });

	const doc = await env.DB.prepare(
		'SELECT id, filename, file_url, status FROM documents WHERE id = ?'
	).bind(params.id).first<{ id: string; filename: string; file_url: string; status: string }>();

	if (!doc) return json({ error: 'Document not found' }, { status: 404 });
	if (!doc.file_url) return json({ error: 'Document has no file URL' }, { status: 400 });

	await env.DB.prepare(
		`UPDATE documents SET status = 'processing' WHERE id = ?`
	).bind(doc.id).run();

	try {
		if (!env.OPENROUTER_API_KEY) {
			throw new Error('OPENROUTER_API_KEY is not configured');
		}

		const imageDataUrl = await fetchImageAsBase64(doc.file_url);
		const result = await callVisionModel(env.OPENROUTER_API_KEY, imageDataUrl);

		const extractionId = crypto.randomUUID();
		const rawJson = JSON.stringify(result);
		const confidenceJson = JSON.stringify({
			confidence: (result.vendor ? 0.25 : 0) + (result.date ? 0.25 : 0) + (result.total ? 0.25 : 0) + ((result.line_items?.length ?? 0) > 0 ? 0.25 : 0),
			fields: {
				vendor: result.vendor ? 0.9 : 0,
				date: result.date ? 0.9 : 0,
				total: result.total ? 0.9 : 0,
				currency: result.currency ? 0.9 : 0
			}
		});

		const existingExt = await env.DB.prepare(
			'SELECT id FROM extractions WHERE document_id = ?'
		).bind(doc.id).first<{ id: string }>();

		const extId = existingExt?.id ?? extractionId;

		if (existingExt) {
			await env.DB.prepare(`
				UPDATE extractions SET vendor = ?, date = ?, total = ?, currency = ?,
					raw_json = ?, confidence_json = ?, edited_json = ?
				WHERE id = ?
			`).bind(
				result.vendor ?? null,
				result.date ?? null,
				result.total ?? null,
				result.currency ?? null,
				rawJson,
				confidenceJson,
				rawJson,
				existingExt.id
			).run();
		} else {
			await env.DB.prepare(`
				INSERT INTO extractions (id, document_id, vendor, date, total, currency, raw_json, confidence_json, edited_json, is_reviewed)
				VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
			`).bind(
				extractionId,
				doc.id,
				result.vendor ?? null,
				result.date ?? null,
				result.total ?? null,
				result.currency ?? null,
				rawJson,
				confidenceJson,
				rawJson
			).run();
		}

		if (result.line_items?.length > 0) {
			await env.DB.prepare('DELETE FROM line_items WHERE extraction_id = ?').bind(extId).run();
			const stmt = env.DB.prepare(`
				INSERT INTO line_items (id, extraction_id, description, quantity, unit_price, amount)
				VALUES (?, ?, ?, ?, ?, ?)
			`);
			for (const item of result.line_items) {
				await stmt.bind(
					crypto.randomUUID(),
					extId,
					item.description ?? null,
					item.quantity ?? null,
					item.unit_price ?? null,
					item.amount ?? null
				).run();
			}
		}

		await env.DB.prepare(`UPDATE documents SET status = 'completed' WHERE id = ?`).bind(doc.id).run();

		return json({ id: doc.id, status: 'completed', extraction: result });

	} catch (err) {
		await env.DB.prepare(`UPDATE documents SET status = 'failed' WHERE id = ?`).bind(doc.id).run();
		return json({ error: 'OCR processing failed', details: String(err) }, { status: 500 });
	}
}
