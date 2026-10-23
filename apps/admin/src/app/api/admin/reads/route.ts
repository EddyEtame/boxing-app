import { apiReads } from '@/server/demo';
import { json } from '@/server/http';
import { getSession } from '@/server/session';

/** Ce que l'API publique a servi depuis le démarrage : la preuve, en direct, que l'app est branchée. */
export async function GET() {
  if (!(await getSession())) return json({ error: 'session' }, { status: 401 });
  return json(apiReads());
}
