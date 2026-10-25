/** Variables injectees au build (CI). Aucune valeur de demonstration. */
export const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? '').replace(/\/$/, '');
/** Pont adherent (apps/bridge). Distinct de l'admin, qui reste sur API_URL. */
export const MEMBER_API_URL = (process.env.EXPO_PUBLIC_MEMBER_API_URL ?? '').replace(/\/$/, '');
export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
export const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const configReady = API_URL.length > 0 && MEMBER_API_URL.length > 0 && SUPABASE_URL.length > 0 && SUPABASE_ANON_KEY.length > 0;
