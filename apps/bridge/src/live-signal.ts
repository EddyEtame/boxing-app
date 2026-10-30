import type { SupabaseClient } from '@supabase/supabase-js';

import type { Env } from './env.ts';
import { createSupabase } from './store.ts';

export type LiveSignalInput = {
  domain: string;
  action: string;
  payload?: Record<string, unknown>;
  club?: string | null;
  profile_id?: string | null;
};

let client: SupabaseClient | null = null;

function sb(env: Env): SupabaseClient | null {
  if (!env.SUPABASE_URL?.trim() || !env.SUPABASE_SERVICE_ROLE_KEY?.trim()) return null;
  if (!client) client = createSupabase(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
  return client;
}

/** Ecrit un signal Realtime (ignore les erreurs reseau pour ne pas bloquer la requete principale). */
export async function pushLiveSignal(env: Env, row: LiveSignalInput): Promise<void> {
  const supabase = sb(env);
  if (!supabase) return;
  const { error } = await supabase.from('live_signals').insert({
    domain: row.domain,
    action: row.action,
    payload: row.payload ?? {},
    club: row.club ?? null,
    profile_id: row.profile_id ?? null,
  });
  if (error) console.error('[bridge] live_signal:', error.message);
}
