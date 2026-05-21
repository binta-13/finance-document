import { json } from '@sveltejs/kit';
import { uploadFile } from '$lib/services/upload.service.js';

export async function POST({ request, platform }) {
	try {
		console.log('Upload POST handler called');
		const env = platform?.env;
		if (!env) return json({ error: 'Platform env not available' }, { status: 500 });
		if (!env.DB) return json({ error: 'D1 database binding not available' }, { status: 500 });
		console.log('Env vars available', { hasCloudName: !!env.CLOUDINARY_CLOUD_NAME, hasUploadPreset: !!env.CLOUDINARY_UPLOAD_PRESET });

		const result = await uploadFile(request, env);
		if ('error' in result) {
			return json({ error: result.error, details: 'details' in result ? result.details : undefined }, { status: result.status });
		}
		return json(result.data);
	} catch (err) {
		console.error('Upload error:', err);
		return json({ error: err instanceof Error ? err.message : String(err), stack: err instanceof Error ? err.stack : undefined }, { status: 500 });
	}
}
