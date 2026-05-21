export interface ExtractionRow {
	id: string; vendor: string | null; date: string | null; total: number | null;
	currency: string | null; raw_json: string | null; confidence_json: string | null;
	edited_json: string | null; is_reviewed: number;
}

export async function findByDocumentId(DB: D1Database, documentId: string): Promise<ExtractionRow | null> {
	return DB.prepare(
		`SELECT id, vendor, date, total, currency, raw_json, confidence_json, edited_json, is_reviewed
		 FROM extractions WHERE document_id = ?`
	).bind(documentId).first<ExtractionRow>();
}

export async function exists(DB: D1Database, documentId: string): Promise<boolean> {
	const row = await DB.prepare('SELECT id FROM extractions WHERE document_id = ?').bind(documentId).first<{ id: string }>();
	return !!row;
}

export async function upsert(
	DB: D1Database,
	documentId: string,
	data: {
		id: string;
		vendor: string | null;
		date: string | null;
		total: number | null;
		currency: string | null;
		raw_json?: string;
		confidence_json?: string;
		edited_json?: string;
		is_reviewed?: number;
	}
) {
	const existing = await DB.prepare('SELECT id FROM extractions WHERE document_id = ?').bind(documentId).first<{ id: string }>();

	if (existing) {
		const updates: string[] = [];
		const binds: unknown[] = [];

		for (const field of ['vendor', 'date', 'currency', 'is_reviewed'] as const) {
			if (data[field] !== undefined) {
				updates.push(`${field} = ?`);
				binds.push(data[field]);
			}
		}
		if (data.total !== undefined) {
			updates.push('total = ?');
			binds.push(data.total);
		}
		if (data.raw_json !== undefined) {
			updates.push('raw_json = ?');
			binds.push(data.raw_json);
		}
		if (data.confidence_json !== undefined) {
			updates.push('confidence_json = ?');
			binds.push(data.confidence_json);
		}
		if (data.edited_json !== undefined) {
			updates.push('edited_json = ?');
			binds.push(typeof data.edited_json === 'string' ? data.edited_json : JSON.stringify(data.edited_json));
		}

		if (updates.length > 0) {
			binds.push(existing.id);
			await DB.prepare(`UPDATE extractions SET ${updates.join(', ')} WHERE id = ?`).bind(...binds).run();
		}
	} else {
		await DB.prepare(`
			INSERT INTO extractions (id, document_id, vendor, date, total, currency, raw_json, confidence_json, edited_json, is_reviewed)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		`).bind(
			data.id,
			documentId,
			data.vendor,
			data.date,
			data.total,
			data.currency,
			data.raw_json ?? '{}',
			data.confidence_json ?? '{}',
			data.edited_json ?? '{}',
			data.is_reviewed ?? 0
		).run();
	}

	return data.id;
}

export async function replaceLineItems(DB: D1Database, extractionId: string, items: {
	description: string | null; quantity: number | null; unit_price: number | null; amount: number | null;
}[]) {
	await DB.prepare('DELETE FROM line_items WHERE extraction_id = ?').bind(extractionId).run();

	if (items.length === 0) return;

	const stmt = DB.prepare(
		`INSERT INTO line_items (id, extraction_id, description, quantity, unit_price, amount) VALUES (?, ?, ?, ?, ?, ?)`
	);
	for (const item of items) {
		await stmt.bind(crypto.randomUUID(), extractionId, item.description, item.quantity, item.unit_price, item.amount).run();
	}
}

export async function findLineItems(DB: D1Database, extractionId: string) {
	const result = await DB.prepare(
		'SELECT id, description, quantity, unit_price, amount FROM line_items WHERE extraction_id = ?'
	).bind(extractionId).all<{
		id: string; description: string | null; quantity: number | null;
		unit_price: number | null; amount: number | null;
	}>();
	return result.results;
}
