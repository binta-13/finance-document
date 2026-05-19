import type { PageLoad } from './$types';

export const load: PageLoad = async ({ fetch }) => {
	try {
		const res = await fetch('/api/documents?limit=50');
		const json = await res.json();
		const docs = (Array.isArray(json.data) ? json.data : []) as Array<Record<string, unknown>>;
		return {
			docs,
			pending: docs.filter((d: Record<string, unknown>) =>
				d.status === 'pending' || d.status === 'processing'
			)
		};
	} catch {
		return { docs: [], pending: [] };
	}
};
