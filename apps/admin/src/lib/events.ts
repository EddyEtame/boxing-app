import { cleanProps, EVENT_NAMES, type AnalyticsEvent, type EventName } from '@bc/contract';

/**
 * La validation d'un événement d'usage, partagée par l'API (`POST /api/events`)
 * et le script de graines. Tout ce qui sort du contrat est refusé ; ce qui
 * pourrait identifier quelqu'un ne passe pas (props filtrées par cleanProps,
 * chemins sans paramètres, identifiants courts et aléatoires).
 */
export const MAX_BATCH = 100;
export const MAX_BODY_BYTES = 128 * 1024;
/** Un téléphone hors ligne garde sa file : on accepte un mois de retard, et 10 minutes d'avance d'horloge. */
export const MAX_AGE_MS = 30 * 24 * 3600 * 1000;
export const MAX_SKEW_MS = 10 * 60 * 1000;

const ID = /^[A-Za-z0-9_-]{1,64}$/;
const ANON = /^[A-Za-z0-9-]{8,64}$/;
const VERSION = /^[0-9A-Za-z.+-]{1,32}$/;
const PATH = /^\/[A-Za-z0-9/_\-[\]().%]{0,119}$/;
const NAMES = new Set<string>(EVENT_NAMES);

/** Une ligne du fichier JSON lines : l'événement, sa réception, sa source (app réelle ou graine de démonstration). */
export type StoredEvent = { e: AnalyticsEvent; r: string; s: 'app' | 'demo' };

export type Rejection = 'forme' | 'nom' | 'date' | 'identifiant' | 'valeur';

export function sanitizeEvent(raw: unknown, now = Date.now(), maxAgeMs = MAX_AGE_MS): { ok: true; event: AnalyticsEvent } | { ok: false; why: Rejection } {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { ok: false, why: 'forme' };
  const o = raw as Record<string, unknown>;
  if (typeof o.name !== 'string' || !NAMES.has(o.name)) return { ok: false, why: 'nom' };
  if (typeof o.id !== 'string' || !ID.test(o.id) || typeof o.anonId !== 'string' || !ANON.test(o.anonId) || typeof o.visit !== 'string' || !ID.test(o.visit)) return { ok: false, why: 'identifiant' };
  const at = typeof o.at === 'string' ? Date.parse(o.at) : Number.NaN;
  if (!Number.isFinite(at) || at < now - maxAgeMs || at > now + MAX_SKEW_MS) return { ok: false, why: 'date' };
  if (o.statut !== 'invite' && o.statut !== 'restreint' && o.statut !== 'actif') return { ok: false, why: 'valeur' };
  if (o.locale !== 'fr' && o.locale !== 'en') return { ok: false, why: 'valeur' };
  if (o.scheme !== 'light' && o.scheme !== 'dark') return { ok: false, why: 'valeur' };
  if (o.platform !== 'ios' && o.platform !== 'android' && o.platform !== 'web') return { ok: false, why: 'valeur' };
  if (typeof o.appVersion !== 'string' || !VERSION.test(o.appVersion)) return { ok: false, why: 'valeur' };
  let path: string | undefined;
  if (o.path !== undefined) {
    if (typeof o.path !== 'string') return { ok: false, why: 'valeur' };
    // Jamais de paramètres ni d'ancre : une adresse peut porter un identifiant.
    const clean = o.path.split('?')[0]!.split('#')[0]!.slice(0, 120);
    path = PATH.test(clean) ? clean : undefined;
  }
  const props = cleanProps(o.props && typeof o.props === 'object' && !Array.isArray(o.props) ? (o.props as Record<string, unknown>) : undefined);
  const event: AnalyticsEvent = {
    id: o.id,
    name: o.name as EventName,
    at: new Date(at).toISOString(),
    anonId: o.anonId,
    visit: o.visit,
    statut: o.statut,
    locale: o.locale,
    scheme: o.scheme,
    platform: o.platform,
    appVersion: o.appVersion,
    ...(path ? { path } : {}),
    ...(props ? { props } : {}),
  };
  return { ok: true, event };
}
