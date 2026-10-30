/**
 * Compte staff dans Supabase Auth + staff_roles.
 * Le cookie de session de l'admin reste la session du panneau.
 * Ici on cree ou retrouve l'utilisateur Auth, sans changer le mot de passe
 * d'un compte adherent deja existant si le mot de passe ne correspond pas.
 */

type Input = {
  email: string;
  password: string;
  role: string;
  name: string;
  clubs: unknown;
  accountId: string;
  signature?: string;
  status?: string;
};

type Cfg = { url: string; key: string };

function cfg(): Cfg | null {
  const url = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim().replace(/\/$/, '');
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  if (!url || !key) return null;
  return { url, key };
}

async function signIn(c: Cfg, email: string, password: string): Promise<string | null> {
  const res = await fetch(`${c.url}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: c.key, authorization: `Bearer ${c.key}`, 'content-type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) return null;
  const body = (await res.json()) as { user?: { id?: string } };
  return typeof body.user?.id === 'string' ? body.user.id : null;
}

async function createUser(c: Cfg, input: Input): Promise<string | null> {
  const res = await fetch(`${c.url}/auth/v1/admin/users`, {
    method: 'POST',
    headers: { apikey: c.key, authorization: `Bearer ${c.key}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      email: input.email,
      password: input.password,
      email_confirm: true,
      user_metadata: { staff: true, role: input.role, account_id: input.accountId },
    }),
  });
  if (!res.ok) return null;
  const body = (await res.json()) as { id?: string };
  return typeof body.id === 'string' ? body.id : null;
}

async function upsertRole(c: Cfg, userId: string, input: Input): Promise<void> {
  const full = {
    user_id: userId,
    role: input.role,
    email: input.email,
    name: input.name,
    clubs: input.clubs,
    status: input.status ?? 'actif',
    signature: input.signature ?? '',
    account_id: input.accountId,
  };
  const send = async (row: Record<string, unknown>) =>
    fetch(`${c.url}/rest/v1/staff_roles`, {
      method: 'POST',
      headers: {
        apikey: c.key,
        authorization: `Bearer ${c.key}`,
        'content-type': 'application/json',
        prefer: 'resolution=merge-duplicates',
      },
      body: JSON.stringify(row),
    });
  const res = await send(full);
  if (res.ok) return;
  await send({ user_id: userId, role: input.role });
}

/** Renvoie l'id Auth, ou null si Supabase n'est pas configure ou si le compte existe avec un autre mot de passe. */
export async function ensureStaffAuth(input: Input): Promise<string | null> {
  const c = cfg();
  if (!c) return null;
  const email = input.email.trim().toLowerCase();
  if (!email || !input.password) return null;
  let userId = await signIn(c, email, input.password);
  if (!userId) userId = await createUser(c, { ...input, email });
  if (!userId) return null;
  await upsertRole(c, userId, { ...input, email });
  return userId;
}
