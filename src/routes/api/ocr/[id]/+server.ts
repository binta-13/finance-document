import { json } from '@sveltejs/kit';
import { runOcr } from '$lib/services/ocr.service.js';

export async function POST({ params, platform }) {
	const env = platform?.env;
	if (!env) return json({ error: 'Platform env not available' }, { status: 500 });
	if (!env.DB) return json({ error: 'D1 database binding not available' }, { status: 500 });

	const result = await runOcr(params.id, env);
	if ('error' in result) {
		return json({ error: result.error, details: 'details' in result ? result.details : undefined }, { status: result.status });
	}
	return json(result.data);
}
