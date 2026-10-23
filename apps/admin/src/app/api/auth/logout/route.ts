import { audit } from '@/server/audit';
import { isSameOrigin, json } from '@/server/http';
import { endSession, getSession } from '@/server/session';

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return json({ error: 'origine' }, { status: 403 });
  const user = await getSession();
  await endSession();
  if (user) await audit(user, 'deconnexion');
  return new Response(null, { status: 204 });
}
