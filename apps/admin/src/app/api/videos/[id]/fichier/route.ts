import { readVideos } from '@/server/content';
import { sessionSecret } from '@/server/env';
import { json } from '@/server/http';

import { signOk } from '../lecture/route';

/** Redirige vers le fichier seulement si l'adresse signee est encore valable. */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const url = new URL(request.url);
  const exp = url.searchParams.get('exp') ?? '';
  const sig = url.searchParams.get('sig') ?? '';
  const secret = sessionSecret();
  if (!secret || !signOk(secret, id, exp, sig)) return json({ error: 'introuvable' }, { status: 404 });
  const video = (await readVideos()).find((v) => v.id === id && v.status === 'publie' && v.source.kind === 'url' && v.source.ref.startsWith('https://'));
  if (!video) return json({ error: 'introuvable' }, { status: 404 });
  return Response.redirect(video.source.ref, 302);
}
