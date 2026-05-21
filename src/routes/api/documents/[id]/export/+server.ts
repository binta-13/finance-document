import { json, text } from '@sveltejs/kit';
import { exportDocument } from '$lib/services/export.service.js';

export async function GET({ params, url, platform }) {
	const env = platform?.env;
	if (!env) return json({ error: 'Platform env not available' }, { status: 500 });
	if (!env.DB) return json({ error: 'D1 database binding not available' }, { status: 500 });

	const format = url.searchParams.get('format') ?? 'json';
	const result = await exportDocument(params.id, format, env);

	if ('error' in result) {
		return json({ error: result.error }, { status: result.status });
	}

	if (result.contentType === 'text/csv; charset=utf-8') {
		return text(result.data as string, {
			headers: {
				'Content-Type': result.contentType,
				'Content-Disposition': `attachment; filename="${result.filename}"`
			}
		});
	}

	return json(result.data, {
		headers: { 'Content-Disposition': `attachment; filename="${result.filename}"` }
	});
}
