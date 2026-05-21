import { json } from '@sveltejs/kit';
import {
  getDocument,
  updateDocument,
  deleteDocument,
} from '$lib/services/document.service.js';

export async function GET({ params, platform }) {
  const env = platform?.env;
  if (!env)
    return json({ error: 'Platform env not available' }, { status: 500 });
  if (!env.DB)
    return json(
      { error: 'D1 database binding not available' },
      { status: 500 },
    );

  const doc = await getDocument(params.id, env);
  if (!doc) return json({ error: 'Document not found' }, { status: 404 });

  return json(doc);
}

export async function PATCH({ params, request, platform }) {
  const env = platform?.env;
  if (!env)
    return json({ error: 'Platform env not available' }, { status: 500 });
  if (!env.DB)
    return json(
      { error: 'D1 database binding not available' },
      { status: 500 },
    );

  const result = await updateDocument(params.id, request, env);
  if ('error' in result) {
    return json({ error: result.error }, { status: result.status });
  }
  return json(result);
}

export async function DELETE({ params, platform }) {
  const env = platform?.env;
  if (!env)
    return json({ error: 'Platform env not available' }, { status: 500 });
  if (!env.DB)
    return json(
      { error: 'D1 database binding not available' },
      { status: 500 },
    );

  const result = await deleteDocument(params.id, env);
  if ('error' in result) {
    return json({ error: result.error }, { status: result.status });
  }
  return json(result.data);
}
