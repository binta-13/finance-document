import type { PageLoad } from './$types';
import type { Document } from '$lib/types.js';
import { DASHBOARD_DOCUMENT_LIMIT } from '$lib/config/constants.js';

export const load: PageLoad = async ({ fetch }) => {
	try {
		const res = await fetch(`/api/documents?limit=${DASHBOARD_DOCUMENT_LIMIT}`);
		const json = await res.json();
		const docs = (Array.isArray(json.data) ? json.data : []) as Document[];
		return {
			docs,
			pending: docs.filter(d => d.status === 'pending' || d.status === 'processing')
		};
	} catch {
		return { docs: [], pending: [] };
	}
};
