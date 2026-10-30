import 'server-only';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Le client Supabase de l'admin, côté serveur seulement, avec la clé de
 * service : il lit les tables que les droits par ligne ferment à l'app
 * (profils, demandes de rapprochement, abonnements). La clé ne sort jamais
 * du serveur ; le navigateur n'a que la clé publique de Realtime
 * (src/lib/supabase-browser.ts). Les écritures restent au serveur applicatif.
 */
let client: SupabaseClient | null = null;
let clientKey = '';

export function supabaseConfigured(): boolean {
  return Boolean(process.env.SUPABASE_URL?.trim() && process.env.SUPABASE_SERVICE_ROLE_KEY?.trim());
}

export function supabaseAdmin(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL?.trim() ?? '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? '';
  if (!url || !key) return null;
  const sig = `${url}\n${key.length}`;
  if (!client || clientKey !== sig) {
    client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
    clientKey = sig;
  }
  return client;
}
