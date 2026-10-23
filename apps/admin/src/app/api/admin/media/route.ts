import { clientIp, isSameOrigin, json } from '@/server/http';
import { can } from '@/lib/permissions';
import { MAX_UPLOAD_BYTES, readLibrary, saveUpload } from '@/server/content-media';
import { hit } from '@/server/rate-limit';
import { getSession } from '@/server/session';

/**
 * Le dépôt d'une photo depuis la photothèque des assistants (actualités,
 * événements, vidéos). Connecté, depuis l'admin lui-même, 8 Mo au plus, une
 * vraie image (vérifiée octet par octet), un texte alternatif. Réponse :
 * `{ upload }`, servi ensuite par /api/media/uploads/<fichier>.
 */
const mayUpload = (role: Parameters<typeof can>[0]) => can(role, 'actualites') || can(role, 'evenements') || can(role, 'videos');

export async function GET() {
  const user = await getSession();
  if (!user) return json({ error: 'session' }, { status: 401 });
  if (!mayUpload(user)) return json({ error: 'droits' }, { status: 403 });
  return json(await readLibrary());
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return json({ error: 'origine' }, { status: 403 });
  const user = await getSession();
  if (!user) return json({ error: 'session' }, { status: 401 });
  if (!mayUpload(user)) return json({ error: 'droits' }, { status: 403 });
  const verdict = hit(`media:${user.id}:${clientIp(request.headers)}`, 40, 10 * 60_000);
  if (!verdict.ok) return json({ error: 'trop_de_depots' }, { status: 429, headers: { 'retry-after': String(verdict.retryAfterSec) } });
  const declared = Number(request.headers.get('content-length') ?? 0);
  if (declared > MAX_UPLOAD_BYTES + 64 * 1024) return json({ error: 'trop-lourd' }, { status: 413 });

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return json({ error: 'formulaire' }, { status: 400 });
  }
  const file = form.get('file');
  const alt = form.get('alt');
  if (!(file instanceof File) || typeof alt !== 'string') return json({ error: 'formulaire' }, { status: 400 });
  if (file.size > MAX_UPLOAD_BYTES) return json({ error: 'trop-lourd' }, { status: 413 });
  const result = await saveUpload(user, new Uint8Array(await file.arrayBuffer()), alt);
  if (!result.ok) return json({ error: result.error }, { status: result.error === 'trop-lourd' ? 413 : 400 });
  return json({ upload: result.upload, duplicate: result.duplicate }, { status: result.duplicate ? 200 : 201 });
}
