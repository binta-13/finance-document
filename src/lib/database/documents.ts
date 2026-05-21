import {
	DEFAULT_PAGE_LIMIT,
	MAX_PAGE_LIMIT,
	STATUS_PROCESSING,
	STATUS_COMPLETED,
	STATUS_FAILED,
} from '$lib/config/constants.js';

export interface DocumentRow {
	id: string; filename: string; file_url: string;
	cloudinary_public_id: string; status: string; created_at: string;
}

export interface DocumentWithExtraction {
	id: string; filename: string; file_url: string; cloudinary_public_id: string;
	status: string; created_at: string;
	extraction_id: string | null; vendor: string | null; date: string | null;
	total: number | null; currency: string | null; is_reviewed: number | null;
}

export interface DocumentListParams {
	page?: number; limit?: number;
	status?: string; vendor?: string;
	dateFrom?: string; dateTo?: string;
}

export async function findById(DB: D1Database, id: string): Promise<DocumentRow | null> {
	return DB.prepare(
		`SELECT id, filename, file_url, cloudinary_public_id, status, created_at
		 FROM documents WHERE id = ?`
	).bind(id).first<DocumentRow>();
}

export async function findByIdWithExtraction(DB: D1Database, id: string) {
	const doc = await DB.prepare(
		`SELECT id, filename, file_url, cloudinary_public_id, status, created_at
		 FROM documents WHERE id = ?`
	).bind(id).first<DocumentRow>();
	if (!doc) return null;

	const extraction = await DB.prepare(
		`SELECT id, vendor, date, total, currency, raw_json, confidence_json, edited_json, is_reviewed
		 FROM extractions WHERE document_id = ?`
	).bind(id).first<{
		id: string; vendor: string | null; date: string | null; total: number | null;
		currency: string | null; raw_json: string | null; confidence_json: string | null;
		edited_json: string | null; is_reviewed: number;
	}>();

	let lineItems: unknown[] = [];
	if (extraction) {
		const result = await DB.prepare(
			`SELECT id, description, quantity, unit_price, amount
			 FROM line_items WHERE extraction_id = ?`
		).bind(extraction.id).all();
		lineItems = result.results;
	}

	return {
		...doc,
		extraction: extraction ? { ...extraction, line_items: lineItems } : null
	};
}

export async function list(DB: D1Database, params: DocumentListParams) {
	const page = Math.max(1, params.page ?? 1);
	const limit = Math.min(MAX_PAGE_LIMIT, Math.max(1, params.limit ?? DEFAULT_PAGE_LIMIT));
	const offset = (page - 1) * limit;

	const conditions: string[] = [];
	const binds: unknown[] = [];

	if (params.status) {
		conditions.push('d.status = ?');
		binds.push(params.status);
	}
	if (params.vendor) {
		conditions.push('e.vendor LIKE ?');
		binds.push(`%${params.vendor}%`);
	}
	if (params.dateFrom) {
		conditions.push('d.created_at >= ?');
		binds.push(params.dateFrom);
	}
	if (params.dateTo) {
		conditions.push('d.created_at <= ?');
		binds.push(params.dateTo);
	}

	const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

	const countResult = await DB.prepare(
		`SELECT COUNT(*) as total FROM documents d
		 LEFT JOIN extractions e ON e.document_id = d.id ${where}`
	).bind(...binds).first<{ total: number }>();

	const total = countResult?.total ?? 0;

	const rows = await DB.prepare(
		`SELECT d.id, d.filename, d.file_url, d.cloudinary_public_id, d.status, d.created_at,
		        e.id as extraction_id, e.vendor, e.date, e.total, e.currency, e.is_reviewed
		 FROM documents d
		 LEFT JOIN extractions e ON e.document_id = d.id ${where}
		 ORDER BY d.created_at DESC LIMIT ? OFFSET ?`
	).bind(...binds, limit, offset).all<DocumentWithExtraction>();

	return {
		data: rows.results as DocumentWithExtraction[],
		pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
	};
}

export async function create(DB: D1Database, data: {
	id: string; filename: string; file_url: string; cloudinary_public_id: string; created_at: string;
}) {
	await DB.prepare(
		`INSERT INTO documents (id, filename, file_url, cloudinary_public_id, status, created_at)
		 VALUES (?, ?, ?, ?, 'pending', ?)`
	).bind(data.id, data.filename, data.file_url, data.cloudinary_public_id, data.created_at).run();
}

export async function update(DB: D1Database, id: string, fields: Record<string, unknown>) {
	const updates: string[] = [];
	const binds: unknown[] = [];

	for (const field of ['filename', 'status', 'file_url', 'cloudinary_public_id'] as const) {
		if (fields[field] !== undefined) {
			updates.push(`${field} = ?`);
			binds.push(fields[field]);
		}
	}

	if (updates.length === 0) return;

	binds.push(id);
	await DB.prepare(`UPDATE documents SET ${updates.join(', ')} WHERE id = ?`).bind(...binds).run();
}

export async function remove(DB: D1Database, id: string) {
	await DB.prepare('DELETE FROM documents WHERE id = ?').bind(id).run();
}

export async function exists(DB: D1Database, id: string): Promise<boolean> {
	const row = await DB.prepare('SELECT id FROM documents WHERE id = ?').bind(id).first<{ id: string }>();
	return !!row;
}

export async function updateStatus(DB: D1Database, id: string, status: string) {
	await DB.prepare(`UPDATE documents SET status = ? WHERE id = ?`).bind(status, id).run();
}
