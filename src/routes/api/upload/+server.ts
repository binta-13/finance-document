import { json } from '@sveltejs/kit';

export async function POST({ request, platform }) {
	const env = platform?.env;
	if (!env) return json({ error: 'Platform env not available' }, { status: 500 });
	if (!env.DB) return json({ error: 'D1 database binding not available' }, { status: 500 });

	const formData = await request.formData();
	const file = formData.get('file') as File | null;
	if (!file) return json({ error: 'No file provided' }, { status: 400 });

	if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
		return json({ error: 'Only image and PDF files are supported' }, { status: 400 });
	}

	const uploadFormData = new FormData();
	uploadFormData.append('file', file);
	uploadFormData.append('upload_preset', env.CLOUDINARY_UPLOAD_PRESET);

	const resourceType = file.type === 'application/pdf' ? 'image' : 'image';
	const uploadRes = await fetch(
		`https://api.cloudinary.com/v1_1/${env.CLOUDINARY_CLOUD_NAME}/${resourceType}/upload`,
		{ method: 'POST', body: uploadFormData }
	);

	const uploadData = await uploadRes.json();
	if (!uploadRes.ok) {
		return json({ error: 'Cloudinary upload failed', details: uploadData }, { status: 500 });
	}

	const fileUrl = uploadData.secure_url as string;
	const publicId = uploadData.public_id as string;
	const filename = file.name;

	const docId = crypto.randomUUID();
	const createdAt = new Date().toISOString();

	await env.DB.prepare(
		`INSERT INTO documents (id, filename, file_url, cloudinary_public_id, status, created_at) VALUES (?, ?, ?, ?, 'pending', ?)`
	).bind(docId, filename, fileUrl, publicId, createdAt).run();

	return json({
		id: docId,
		filename,
		fileUrl,
		publicId,
		status: 'pending',
		extractionId: null
	});
}
