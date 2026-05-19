import { json, text } from '@sveltejs/kit';

export async function GET({ params, url, platform }) {
	const env = platform?.env;
	if (!env) return json({ error: 'Platform env not available' }, { status: 500 });
	if (!env.DB) return json({ error: 'D1 database binding not available' }, { status: 500 });

	const doc = await env.DB.prepare(
		'SELECT id, filename, status, created_at FROM documents WHERE id = ?'
	).bind(params.id).first<{ id: string; filename: string; status: string; created_at: string }>();

	if (!doc) return json({ error: 'Document not found' }, { status: 404 });

	const extraction = await env.DB.prepare(
		`SELECT id, vendor, date, total, currency, raw_json, edited_json, is_reviewed
		 FROM extractions WHERE document_id = ?`
	).bind(params.id).first<{
		id: string; vendor: string | null; date: string | null; total: number | null;
		currency: string | null; raw_json: string | null; edited_json: string | null; is_reviewed: number;
	}>();

	if (!extraction) return json({ error: 'No extraction found for this document' }, { status: 404 });

	let lineItems: { description: string | null; quantity: number | null; unit_price: number | null; amount: number | null }[] = [];
	const liResult = await env.DB.prepare(
		'SELECT description, quantity, unit_price, amount FROM line_items WHERE extraction_id = ?'
	).bind(extraction.id).all();
	lineItems = liResult.results as typeof lineItems;

	function escapeCsv(val: unknown): string {
		const s = val?.toString() ?? '';
		if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
			return `"${s.replace(/"/g, '""')}"`;
		}
		return s;
	}

	const format = url.searchParams.get('format') ?? 'json';
	const payload = extraction.edited_json ? JSON.parse(extraction.edited_json) : JSON.parse(extraction.raw_json ?? '{}');
	const output = { document: { id: doc.id, filename: doc.filename }, extraction: { ...payload, line_items: lineItems } };

	if (format === 'csv') {
		const header = 'vendor,date,total,currency,description,quantity,unit_price,amount';
		const rows = lineItems.length
			? lineItems.map(i =>
				[escapeCsv(payload.vendor), escapeCsv(payload.date), escapeCsv(payload.total), escapeCsv(payload.currency),
				 escapeCsv(i.description), escapeCsv(i.quantity), escapeCsv(i.unit_price), escapeCsv(i.amount)].join(',')
			).join('\r\n')
			: `${escapeCsv(payload.vendor)},${escapeCsv(payload.date)},${escapeCsv(payload.total)},${escapeCsv(payload.currency)},,,,,`;
		return text(`${header}\r\n${rows}`, {
			headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="${doc.filename}_export.csv"` }
		});
	}

	return json(output, {
		headers: { 'Content-Disposition': `attachment; filename="${doc.filename}_export.json"` }
	});
}
