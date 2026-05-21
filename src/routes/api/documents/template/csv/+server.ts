import { json, text } from '@sveltejs/kit';
import { generateInvoiceCsvTemplate } from '$lib/csv.js';
import { exportCsvTemplate } from '$lib/services/export.service.js';

export async function GET({ url, platform }) {
	const documentId = url.searchParams.get('documentId');

	if (documentId) {
		const env = platform?.env;
		if (!env) return json({ error: 'Platform env not available' }, { status: 500 });
		if (!env.DB) return json({ error: 'D1 database binding not available' }, { status: 500 });

		const result = await exportCsvTemplate(documentId, env);

		if ('error' in result) {
			return json({ error: result.error }, { status: result.status });
		}

		return text(result.data as string, {
			headers: {
				'Content-Type': 'text/csv; charset=utf-8',
				'Content-Disposition': `attachment; filename="${result.filename}"`
			}
		});
	}

	const csv = generateInvoiceCsvTemplate();
	return text(csv, {
		headers: {
			'Content-Type': 'text/csv; charset=utf-8',
			'Content-Disposition': 'attachment; filename="invoice_template.csv"'
		}
	});
}
