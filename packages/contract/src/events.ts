import type { Statut } from './passages';

/**
 * LES ÉVÉNEMENTS D'USAGE (CDC §15 « suivi des statistiques d'utilisation » ;
 * demande d'Eddy du 20/10/2026 : voir surtout l'expérience des non-membres).
 *
 * Règles RGPD tenues par le contrat lui-même :
 * - aucun nom, e-mail, téléphone ni identifiant Deciplus : `anonId` est un
 *   tirage aléatoire propre à l'installation, effaçable avec l'app ;
 * - `props` n'accepte que des valeurs simples, d'une liste fermée de clés ;
 * - l'utilisateur peut couper la mesure dans Plus → Réglages.
 * Mesure d'audience première partie, sans croisement : le cadre d'exemption de
 * consentement de la CNIL est visé, à valider par le juriste du club.
 */
export const EVENT_NAMES = [
  'app_open',
  'screen_view',
  'preface_step',
  'preface_done',
  'theme_change',
  'locale_change',
  'cta_create_account',
  'cta_sign_in',
  'offer_open',
  'planning_view',
  'planning_session_open',
  'planning_share',
  'session_share',
  'session_favorite',
  'stats_view',
  'stats_goal',
  'bar_save',
  'message_send',
  'video_open',
  'training_join',
  'training_publish',
  'badge_open',
] as const;

export type EventName = (typeof EVENT_NAMES)[number];

export const EVENT_PROP_KEYS = ['club', 'mode', 'famille', 'step', 'choice', 'channel', 'section', 'from', 'value', 'locked', 'count'] as const;
export type EventPropKey = (typeof EVENT_PROP_KEYS)[number];
export type EventProps = Partial<Record<EventPropKey, string | number | boolean>>;

export type AnalyticsEvent = {
  id: string;
  name: EventName;
  /** ISO 8601 (UTC). */
  at: string;
  anonId: string;
  /** Session d'usage : un nouvel identifiant après 30 minutes d'inactivité. */
  visit: string;
  statut: Statut;
  locale: 'fr' | 'en';
  scheme: 'light' | 'dark';
  platform: 'ios' | 'android' | 'web';
  appVersion: string;
  path?: string;
  props?: EventProps;
};

export type EventBatch = { events: AnalyticsEvent[] };

/** Ne garde que les clés connues et les valeurs simples ; coupe les chaînes longues. */
export function cleanProps(props: Record<string, unknown> | undefined): EventProps | undefined {
  if (!props) return undefined;
  const out: EventProps = {};
  for (const key of EVENT_PROP_KEYS) {
    const v = props[key];
    if (typeof v === 'number' || typeof v === 'boolean') out[key] = v;
    else if (typeof v === 'string') out[key] = v.slice(0, 64);
  }
  return Object.keys(out).length ? out : undefined;
}
