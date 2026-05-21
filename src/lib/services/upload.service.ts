import { CLOUDINARY_UPLOAD_URL, ALLOWED_MIME_TYPES } from '$lib/config/constants.js';
import * as documents from '$lib/database/documents.js';

export async function uploadFile(request: Request, env: App.Platform['env']) {
	const formData = await request.formData();
	const file = formData.get('file') as File | null;
	if (!file) return { error: 'No file provided', status: 400 as const };

	if (!ALLOWED_MIME_TYPES.includes(file.type)) {
		return { error: 'Only image and PDF files are supported', status: 400 as const };
	}

	const uploadFormData = new FormData();
	uploadFormData.append('file', file);
	uploadFormData.append('upload_preset', env.CLOUDINARY_UPLOAD_PRESET);

	const resourceType = 'image';
	const uploadRes = await fetch(CLOUDINARY_UPLOAD_URL(env.CLOUDINARY_CLOUD_NAME, resourceType), {
		method: 'POST',
		body: uploadFormData
	});

	const uploadData = await uploadRes.json();
	if (!uploadRes.ok) {
		return { error: 'Cloudinary upload failed', details: uploadData, status: 500 as const };
	}

	const docId = crypto.randomUUID();
	await documents.create(env.DB, {
		id: docId,
		filename: file.name,
		file_url: uploadData.secure_url as string,
		cloudinary_public_id: uploadData.public_id as string,
		created_at: new Date().toISOString(),
	});

	return {
		data: {
			id: docId,
			filename: file.name,
			fileUrl: uploadData.secure_url as string,
			publicId: uploadData.public_id as string,
			status: 'pending',
			extractionId: null
		}
	};
}
