import * as documents from '$lib/database/documents.js';
import * as extractions from '$lib/database/extractions.js';

export type Env = App.Platform['env'];

export async function getDocument(id: string, env: Env) {
	return documents.findByIdWithExtraction(env.DB, id);
}

export async function listDocuments(env: Env, params: documents.DocumentListParams) {
	return documents.list(env.DB, params);
}

export async function deleteDocument(id: string, env: Env) {
	if (!(await documents.exists(env.DB, id))) {
		return { error: 'Document not found', status: 404 as const };
	}
	await documents.remove(env.DB, id);
	return { data: { success: true } };
}

export async function updateDocument(id: string, request: Request, env: Env) {
	if (!(await documents.exists(env.DB, id))) {
		return { error: 'Document not found', status: 404 as const };
	}

	const body = await request.json();

	await documents.update(env.DB, id, body);

	if (body.extraction) {
		const ext = body.extraction;
		const extId = await extractions.upsert(env.DB, id, {
			id: crypto.randomUUID(),
			vendor: ext.vendor ?? null,
			date: ext.date ?? null,
			total: ext.total ?? null,
			currency: ext.currency ?? null,
			edited_json: ext.edited_json,
			is_reviewed: ext.is_reviewed ?? 0,
		});

		if (ext.line_items) {
			await extractions.replaceLineItems(
				env.DB,
				extId,
				ext.line_items.map((i: Record<string, unknown>) => ({
					description: (i.description as string) ?? null,
					quantity: i.quantity ? Math.round(parseFloat(String(i.quantity))) : null,
					unit_price: i.unit_price ? Math.round(parseFloat(String(i.unit_price))) : null,
					amount: i.amount ? Math.round(parseFloat(String(i.amount))) : null,
				}))
			);
		}
	}

	return (await documents.findById(env.DB, id))!;
}
