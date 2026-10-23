import { DEMO_MEMBER_ID, type DemoPassagesResponse } from '@bc/contract';

import { can } from '@/lib/permissions';
import { isOn } from '@/server/collections';
import { checkPassages, checkPattern, noteApiRead, readDemo, saveDemo, toResponse } from '@/server/demo';
import { corsHeaders, isSameOrigin, json } from '@/server/http';
import { getSession } from '@/server/session';

/**
 * API.demoPassages(id) du contrat (@bc/contract) :
 *  - GET : lecture libre (l'app la relit toutes les 5 s), CORS pour le serveur
 *    Expo de développement et le réseau local ;
 *  - PUT : l'admin connecté, avec le droit « demo », depuis l'admin lui-même.
 * Tout identifiant autre que le compte de démonstration est refusé : en
 * production, les statistiques viennent des vrais passages (CDC §6).
 */
const METHODS = 'GET, PUT, OPTIONS';

const notDemo = {
  error: 'not_demo_member',
  message: 'Seul le compte de démonstration reçoit un historique fabriqué ; les statistiques d’un adhérent viennent de ses passages réels (CDC §6).',
};

export function OPTIONS(request: Request) {
  return new Response(null, { status: 204, headers: corsHeaders(request, METHODS) });
}

export async function GET(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const headers = corsHeaders(request, METHODS);
  const { id } = await ctx.params;
  if (id !== DEMO_MEMBER_ID) return json(notDemo, { status: 404, headers });
  if (!(await isOn('demo'))) return json({ error: 'demo_off', message: 'Le mode démonstration est coupé dans « Fonctions ».' }, { status: 404, headers });
  const body: DemoPassagesResponse = toResponse(await readDemo());
  noteApiRead('demo', request);
  return json(body, { headers });
}

export async function PUT(request: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!isSameOrigin(request)) return json({ error: 'origine' }, { status: 403 });
  const user = await getSession();
  if (!user) return json({ error: 'session' }, { status: 401 });
  if (!can(user, 'demo')) return json({ error: 'droits' }, { status: 403 });
  const { id } = await ctx.params;
  if (id !== DEMO_MEMBER_ID) return json(notDemo, { status: 403 });

  const raw = await request.text();
  if (raw.length > 256 * 1024) return json({ error: 'trop_gros' }, { status: 413 });
  let body: { pattern?: unknown; passages?: unknown; rolling?: unknown };
  try {
    body = JSON.parse(raw) as typeof body;
  } catch {
    return json({ error: 'invalide' }, { status: 400 });
  }

  const current = await readDemo();
  const pattern = body.pattern === undefined ? { ok: true as const, value: current.pattern } : checkPattern(body.pattern);
  if (!pattern.ok) return json({ error: 'invalide', fields: pattern.errors }, { status: 422 });
  let passages: ReturnType<typeof checkPassages> | null = null;
  if (body.passages !== undefined) {
    passages = checkPassages(body.passages);
    if (!passages.ok) return json({ error: 'invalide', fields: passages.errors }, { status: 422 });
  }
  const rolling = typeof body.rolling === 'boolean' ? body.rolling : current.rolling;
  const saved = await saveDemo({ pattern: pattern.value, rolling, passages: passages?.ok ? passages.value : undefined }, user);
  const response: DemoPassagesResponse = toResponse(saved);
  return json(response);
}
