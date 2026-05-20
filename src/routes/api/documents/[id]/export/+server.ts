import { json, text } from '@sveltejs/kit';
import { generateInvoiceCsv, type InvoiceLineItem } from '$lib/csv.js';

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

	const liResult = await env.DB.prepare(
		'SELECT id, description, quantity, unit_price, amount FROM line_items WHERE extraction_id = ?'
	).bind(extraction.id).all<InvoiceLineItem>();
	const lineItems = liResult.results as InvoiceLineItem[];

	const format = url.searchParams.get('format') ?? 'json';
	const payload = extraction.edited_json ? JSON.parse(extraction.edited_json) : JSON.parse(extraction.raw_json ?? '{}');
	const output = { document: { id: doc.id, filename: doc.filename }, extraction: { ...payload, line_items: lineItems } };

	if (format === 'csv') {
		const csv = generateInvoiceCsv({
			id: doc.id,
			filename: doc.filename,
			status: doc.status,
			created_at: doc.created_at,
			vendor: (payload as Record<string, unknown>).vendor as string | null ?? extraction.vendor,
			date: (payload as Record<string, unknown>).date as string | null ?? extraction.date,
			total: (payload as Record<string, unknown>).total as number | null ?? extraction.total,
			currency: (payload as Record<string, unknown>).currency as string | null ?? extraction.currency,
			is_reviewed: extraction.is_reviewed === 1,
			line_items: lineItems,
		});
		return text(csv, {
			headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="${doc.filename}_export.csv"` }
		});
	}

	return json(output, {
		headers: { 'Content-Disposition': `attachment; filename="${doc.filename}_export.json"` }
	});
}
