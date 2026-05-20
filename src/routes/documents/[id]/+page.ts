import type { PageLoad } from './$types';
import type { Document } from '$lib/types.js';

export const load: PageLoad = async ({ params, fetch }) => {
	const res = await fetch(`/api/documents/${params.id}`);
	if (!res.ok) return { doc: null as Document | null };
	return { doc: await res.json() as Document };
};
