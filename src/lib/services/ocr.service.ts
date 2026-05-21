import { OPENROUTER_URL, OPENROUTER_MODELS } from '$lib/config/constants.js';
import * as documents from '$lib/database/documents.js';
import * as extractions from '$lib/database/extractions.js';

export interface VisionLineItem {
	description: string | null;
	quantity: number | null;
	unit_price: number | null;
	amount: number | null;
}

export interface VisionResult {
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
	for (const model of OPENROUTER_MODELS) {
		const response = await fetch(OPENROUTER_URL, {
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

export async function runOcr(documentId: string, env: App.Platform['env']) {
	const doc = await documents.findById(env.DB, documentId);
	if (!doc) return { error: 'Document not found', status: 404 as const };
	if (!doc.file_url) return { error: 'Document has no file URL', status: 400 as const };

	await documents.updateStatus(env.DB, doc.id, 'processing');

	try {
		if (!env.OPENROUTER_API_KEY) {
			throw new Error('OPENROUTER_API_KEY is not configured');
		}

		const imageDataUrl = await fetchImageAsBase64(doc.file_url);
		const result = await callVisionModel(env.OPENROUTER_API_KEY, imageDataUrl);

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

		const extractionId = await extractions.upsert(env.DB, doc.id, {
			id: crypto.randomUUID(),
			vendor: result.vendor ?? null,
			date: result.date ?? null,
			total: result.total ?? null,
			currency: result.currency ?? null,
			raw_json: rawJson,
			confidence_json: confidenceJson,
			edited_json: rawJson,
		});

		if (result.line_items?.length > 0) {
			await extractions.replaceLineItems(env.DB, extractionId, result.line_items);
		}

		await documents.updateStatus(env.DB, doc.id, 'completed');

		return { data: { id: doc.id, status: 'completed', extraction: result } };
	} catch (err) {
		await documents.updateStatus(env.DB, doc.id, 'failed');
		return { error: 'OCR processing failed', details: String(err), status: 500 as const };
	}
}
