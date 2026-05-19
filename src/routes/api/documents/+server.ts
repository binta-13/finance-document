import { json } from '@sveltejs/kit';

export async function GET({ url, platform }) {
	const env = platform?.env;
	if (!env) return json({ error: 'Platform env not available' }, { status: 500 });
	if (!env.DB) return json({ error: 'D1 database binding not available — run with wrangler pages dev' }, { status: 500 });

	const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1'));
	const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') ?? '20')));
	const offset = (page - 1) * limit;
	const status = url.searchParams.get('status');
	const vendor = url.searchParams.get('vendor');
	const dateFrom = url.searchParams.get('date_from');
	const dateTo = url.searchParams.get('date_to');

	const conditions: string[] = [];
	const binds: unknown[] = [];

	if (status) {
		conditions.push('d.status = ?');
		binds.push(status);
	}
	if (vendor) {
		conditions.push('e.vendor LIKE ?');
		binds.push(`%${vendor}%`);
	}
	if (dateFrom) {
		conditions.push('d.created_at >= ?');
		binds.push(dateFrom);
	}
	if (dateTo) {
		conditions.push('d.created_at <= ?');
		binds.push(dateTo);
	}

	const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

	const countResult = await env.DB.prepare(
		`SELECT COUNT(*) as total FROM documents d
		 LEFT JOIN extractions e ON e.document_id = d.id
		 ${where}`
	).bind(...binds).first<{ total: number }>();

	const total = countResult?.total ?? 0;

	const rows = await env.DB.prepare(
		`SELECT d.id, d.filename, d.file_url, d.cloudinary_public_id, d.status, d.created_at,
		        e.id as extraction_id, e.vendor, e.date, e.total, e.currency, e.is_reviewed
		 FROM documents d
		 LEFT JOIN extractions e ON e.document_id = d.id
		 ${where}
		 ORDER BY d.created_at DESC
		 LIMIT ? OFFSET ?`
	).bind(...binds, limit, offset).all<{
		id: string; filename: string; file_url: string; cloudinary_public_id: string;
		status: string; created_at: string;
		extraction_id: string | null; vendor: string | null; date: string | null;
		total: number | null; currency: string | null; is_reviewed: number | null;
	}>();

	return json({
		data: rows.results,
		pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
	});
}
