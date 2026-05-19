import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params, fetch }) => {
	const res = await fetch(`/api/documents/${params.id}`);
	if (!res.ok) return { doc: null as Record<string, unknown> | null };
	return { doc: await res.json() as Record<string, unknown> };
};
