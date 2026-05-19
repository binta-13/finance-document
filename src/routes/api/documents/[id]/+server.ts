import { json } from '@sveltejs/kit';

export async function GET({ params, platform }) {
	const env = platform?.env;
	if (!env) return json({ error: 'Platform env not available' }, { status: 500 });
	if (!env.DB) return json({ error: 'D1 database binding not available — run with wrangler pages dev' }, { status: 500 });

	const doc = await env.DB.prepare(
		`SELECT id, filename, file_url, cloudinary_public_id, status, created_at
		 FROM documents WHERE id = ?`
	).bind(params.id).first<{
		id: string; filename: string; file_url: string;
		cloudinary_public_id: string; status: string; created_at: string;
	}>();

	if (!doc) return json({ error: 'Document not found' }, { status: 404 });

	const extraction = await env.DB.prepare(
		`SELECT id, vendor, date, total, currency, raw_json, confidence_json, edited_json, is_reviewed
		 FROM extractions WHERE document_id = ?`
	).bind(params.id).first<{
		id: string; vendor: string | null; date: string | null; total: number | null;
		currency: string | null; raw_json: string | null; confidence_json: string | null;
		edited_json: string | null; is_reviewed: number;
	}>();

	let lineItems: unknown[] = [];
	if (extraction) {
		const result = await env.DB.prepare(
			`SELECT id, description, quantity, unit_price, amount
			 FROM line_items WHERE extraction_id = ?`
		).bind(extraction.id).all();
		lineItems = result.results;
	}

	return json({
		...doc,
		extraction: extraction ? { ...extraction, line_items: lineItems } : null
	});
}

export async function PATCH({ params, request, platform }) {
	const env = platform?.env;
	if (!env) return json({ error: 'Platform env not available' }, { status: 500 });
	if (!env.DB) return json({ error: 'D1 database binding not available — run with wrangler pages dev' }, { status: 500 });

	const existing = await env.DB.prepare(
		'SELECT id FROM documents WHERE id = ?'
	).bind(params.id).first<{ id: string }>();

	if (!existing) return json({ error: 'Document not found' }, { status: 404 });

	const body = await request.json();
	const docUpdates: string[] = [];
	const docBinds: unknown[] = [];

	for (const field of ['filename', 'status', 'file_url', 'cloudinary_public_id'] as const) {
		if (body[field] !== undefined) {
			docUpdates.push(`${field} = ?`);
			docBinds.push(body[field]);
		}
	}

	if (docUpdates.length > 0) {
		docBinds.push(params.id);
		await env.DB.prepare(
			`UPDATE documents SET ${docUpdates.join(', ')} WHERE id = ?`
		).bind(...docBinds).run();
	}

	if (body.extraction) {
		const ext = body.extraction;
		const extRec = await env.DB.prepare(
			'SELECT id FROM extractions WHERE document_id = ?'
		).bind(params.id).first<{ id: string }>();

		const extId = extRec?.id ?? crypto.randomUUID();

		if (extRec) {
			const extUpdates: string[] = [];
			const extBinds: unknown[] = [];
			for (const field of ['vendor', 'date', 'currency', 'is_reviewed'] as const) {
				if (ext[field] !== undefined) {
					extUpdates.push(`${field} = ?`);
					extBinds.push(ext[field]);
				}
			}
			if (ext.total !== undefined) {
				extUpdates.push('total = ?');
				extBinds.push(ext.total);
			}
			if (ext.edited_json !== undefined) {
				extUpdates.push('edited_json = ?');
				extBinds.push(typeof ext.edited_json === 'string' ? ext.edited_json : JSON.stringify(ext.edited_json));
			}
			if (extUpdates.length > 0) {
				extBinds.push(extRec.id);
				await env.DB.prepare(
					`UPDATE extractions SET ${extUpdates.join(', ')} WHERE id = ?`
				).bind(...extBinds).run();
			}
		} else {
			await env.DB.prepare(`
				INSERT INTO extractions (id, document_id, vendor, date, total, currency, edited_json, is_reviewed)
				VALUES (?, ?, ?, ?, ?, ?, ?, ?)
			`).bind(
				extId,
				params.id,
				ext.vendor ?? null,
				ext.date ?? null,
				ext.total ?? null,
				ext.currency ?? null,
				typeof ext.edited_json === 'string' ? ext.edited_json : JSON.stringify(ext.edited_json ?? {}),
				ext.is_reviewed ?? 0
			).run();
		}

		if (ext.line_items) {
			await env.DB.prepare('DELETE FROM line_items WHERE extraction_id = ?').bind(extId).run();
			if (ext.line_items.length > 0) {
				const stmt = env.DB.prepare(
					`INSERT INTO line_items (id, extraction_id, description, quantity, unit_price, amount) VALUES (?, ?, ?, ?, ?, ?)`
				);
				for (const item of ext.line_items) {
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
		}
	}

	const doc = await env.DB.prepare(
		`SELECT id, filename, file_url, cloudinary_public_id, status, created_at
		 FROM documents WHERE id = ?`
	).bind(params.id).first<{
		id: string; filename: string; file_url: string;
		cloudinary_public_id: string; status: string; created_at: string;
	}>();

	return json(doc);
}

export async function DELETE({ params, platform }) {
	const env = platform?.env;
	if (!env) return json({ error: 'Platform env not available' }, { status: 500 });
	if (!env.DB) return json({ error: 'D1 database binding not available' }, { status: 500 });

	const existing = await env.DB.prepare(
		'SELECT id FROM documents WHERE id = ?'
	).bind(params.id).first<{ id: string }>();

	if (!existing) return json({ error: 'Document not found' }, { status: 404 });

	await env.DB.prepare('DELETE FROM documents WHERE id = ?').bind(params.id).run();

	return json({ success: true });
}
