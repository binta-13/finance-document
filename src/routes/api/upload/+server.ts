import { json } from '@sveltejs/kit';
import { uploadFile } from '$lib/services/upload.service.js';

export async function POST({ request, platform }) {
	const env = platform?.env;
	if (!env) return json({ error: 'Platform env not available' }, { status: 500 });
	if (!env.DB) return json({ error: 'D1 database binding not available' }, { status: 500 });

	const result = await uploadFile(request, env);
	if ('error' in result) {
		return json({ error: result.error, details: 'details' in result ? result.details : undefined }, { status: result.status });
	}
	return json(result.data);
}
