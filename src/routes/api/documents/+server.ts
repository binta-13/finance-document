import { json } from '@sveltejs/kit';
import { listDocuments } from '$lib/services/document.service.js';

export async function GET({ url, platform }) {
	try {
		console.log('Documents GET handler called');
		const env = platform?.env;
		if (!env) return json({ error: 'Platform env not available' }, { status: 500 });
		if (!env.DB) return json({ error: 'D1 database binding not available' }, { status: 500 });
		console.log('DB binding available:', !!env.DB);

		const result = await listDocuments(env, {
			page: parseInt(url.searchParams.get('page') ?? '1'),
			limit: parseInt(url.searchParams.get('limit') ?? '20'),
			status: url.searchParams.get('status') ?? undefined,
			vendor: url.searchParams.get('vendor') ?? undefined,
			dateFrom: url.searchParams.get('date_from') ?? undefined,
			dateTo: url.searchParams.get('date_to') ?? undefined,
		});

		return json(result);
	} catch (err) {
		console.error('Documents GET error:', err);
		return json({ error: err instanceof Error ? err.message : String(err), stack: err instanceof Error ? err.stack : undefined }, { status: 500 });
	}
}
