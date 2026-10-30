/**
 * Collections de l'admin dans Postgres (table admin_collections).
 * Sans SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY, ou si la table n'existe pas
 * encore, l'appelant reste sur les fichiers JSON.
 */

type Cfg = { url: string; key: string };

let disabled = false;

function cfg(): Cfg | null {
  if (disabled) return null;
  const url = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim().replace(/\/$/, '');
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  if (!url || !key) return null;
  return { url, key };
}

function headers(key: string, extra?: Record<string, string>): Headers {
  return new Headers({
    apikey: key,
    authorization: `Bearer ${key}`,
    ...extra,
  });
}

export type PgRead = { ok: true; body: unknown | null } | { ok: false };

export async function pgReadCollection(name: string): Promise<PgRead> {
  const c = cfg();
  if (!c) return { ok: false };
  let res: Response;
  try {
    res = await fetch(`${c.url}/rest/v1/admin_collections?name=eq.${encodeURIComponent(name)}&select=body`, {
      headers: headers(c.key),
      cache: 'no-store',
    });
  } catch {
    return { ok: false };
  }
  if (res.status === 404) {
    disabled = true;
    return { ok: false };
  }
  if (!res.ok) {
    const text = await res.text();
    if (text.includes('42P01') || text.includes('admin_collections')) disabled = true;
    return { ok: false };
  }
  const rows = (await res.json()) as { body?: unknown }[];
  return { ok: true, body: rows[0]?.body ?? null };
}

export async function pgWriteCollection(name: string, body: unknown): Promise<boolean> {
  const c = cfg();
  if (!c) return false;
  const res = await fetch(`${c.url}/rest/v1/admin_collections`, {
    method: 'POST',
    headers: headers(c.key, { 'content-type': 'application/json', prefer: 'resolution=merge-duplicates' }),
    body: JSON.stringify({ name, body, updated_at: new Date().toISOString() }),
  });
  if (!res.ok) {
    const text = await res.text();
    if (text.includes('42P01')) disabled = true;
    return false;
  }
  return true;
}

/** Ligne du journal staff. N'echoue pas l'action admin si la table n'accepte pas encore la ligne. */
export async function pgInsertAudit(entry: { actorId: string; name: string; role: string; action: string; target?: string; detail?: string }): Promise<void> {
  const c = cfg();
  if (!c) return;
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(entry.actorId) ? entry.actorId : null;
  const res = await fetch(`${c.url}/rest/v1/audit_log`, {
    method: 'POST',
    headers: headers(c.key, { 'content-type': 'application/json', prefer: 'return=minimal' }),
    body: JSON.stringify({
      actor: uuid,
      action: entry.action.slice(0, 120),
      target: null,
      details: {
        actorId: entry.actorId,
        name: entry.name,
        role: entry.role,
        target: entry.target ?? null,
        detail: entry.detail ?? null,
      },
    }),
  });
  if (!res.ok) console.error('[admin] audit_log', res.status);
}
