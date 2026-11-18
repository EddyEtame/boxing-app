/** Variables injectees au build (CI). Aucune valeur de demonstration. */
const adminUrl = (process.env.EXPO_PUBLIC_API_URL ?? '').trim().replace(/\/$/, '');
const memberUrl = (process.env.EXPO_PUBLIC_MEMBER_API_URL ?? '').trim().replace(/\/$/, '');
export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() ?? '';
export const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? '';

export const configReady = Boolean(adminUrl && memberUrl && SUPABASE_URL && SUPABASE_ANON_KEY);

// Une configuration partielle coupe les deux API et laisse les données locales à l'écran.
export const API_URL = configReady ? adminUrl : '';
export const MEMBER_API_URL = configReady ? memberUrl : '';
