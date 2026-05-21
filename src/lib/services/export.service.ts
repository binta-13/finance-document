import { generateInvoiceCsv, generateInvoiceCsvTemplate, type InvoiceLineItem, type InvoiceCsvData } from '$lib/csv.js';
import * as documents from '$lib/database/documents.js';
import * as extractions from '$lib/database/extractions.js';

export async function exportDocument(documentId: string, format: string, env: App.Platform['env']) {
	const doc = await documents.findById(env.DB, documentId);
	if (!doc) return { error: 'Document not found', status: 404 as const };

	const extraction = await extractions.findByDocumentId(env.DB, documentId);
	if (!extraction) return { error: 'No extraction found for this document', status: 404 as const };

	const lineItems = await extractions.findLineItems(env.DB, extraction.id) as InvoiceLineItem[];

	const payload = extraction.edited_json
		? JSON.parse(extraction.edited_json)
		: JSON.parse(extraction.raw_json ?? '{}');

	if (format === 'csv') {
		const data: InvoiceCsvData = {
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
		};
		return {
			data: generateInvoiceCsv(data),
			contentType: 'text/csv; charset=utf-8' as const,
			filename: `${doc.filename}_export.csv`
		};
	}

	const output = { document: { id: doc.id, filename: doc.filename }, extraction: { ...payload, line_items: lineItems } };
	return {
		data: output,
		contentType: 'application/json' as const,
		filename: `${doc.filename}_export.json`
	};
}

export async function exportCsvTemplate(documentId: string | null, env: App.Platform['env']) {
	if (!documentId) {
		return { data: generateInvoiceCsvTemplate(), filename: 'invoice_template.csv' };
	}

	const doc = await documents.findById(env.DB, documentId);
	if (!doc) return { error: 'Document not found', status: 404 as const };

	const extraction = await extractions.findByDocumentId(env.DB, documentId);
	const payload = extraction
		? (extraction.edited_json ? JSON.parse(extraction.edited_json) : JSON.parse(extraction.raw_json ?? '{}'))
		: {};

	const lineItems = extraction
		? await extractions.findLineItems(env.DB, extraction.id) as InvoiceLineItem[]
		: [];

	const csv = generateInvoiceCsv({
		id: doc.id,
		filename: doc.filename,
		status: doc.status,
		created_at: doc.created_at,
		vendor: (payload as Record<string, unknown>).vendor as string | null ?? extraction?.vendor ?? null,
		date: (payload as Record<string, unknown>).date as string | null ?? extraction?.date ?? null,
		total: (payload as Record<string, unknown>).total as number | null ?? extraction?.total ?? null,
		currency: (payload as Record<string, unknown>).currency as string | null ?? extraction?.currency ?? null,
		is_reviewed: (extraction?.is_reviewed ?? 0) === 1,
		line_items: lineItems,
	});

	return { data: csv, filename: `${doc.filename}_template.csv` };
}
