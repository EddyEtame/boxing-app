import { EVENT_NAMES, cleanProps } from '@bc/contract';
import type { AnalyticsEvent } from '@bc/contract';

import type { StoredEvent } from './store.ts';

const NAMES = new Set<string>(EVENT_NAMES);
const STATUTS = new Set(['invite', 'restreint', 'actif']);
const LOCALES = new Set(['fr', 'en']);
const SCHEMES = new Set(['light', 'dark']);
const PLATFORMS = new Set(['ios', 'android', 'web']);

function bound(value: unknown, max: number): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, max);
}

function parseOne(value: unknown): StoredEvent | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const event = value as Record<string, unknown>;
  const name = typeof event.name === 'string' ? event.name : '';
  if (!NAMES.has(name)) return null;
  const id = bound(event.id, 80);
  const anonId = bound(event.anonId, 80);
  const visit = bound(event.visit, 80);
  const appVersion = bound(event.appVersion, 32);
  const at = bound(event.at, 40);
  if (!id || !anonId || !visit || !appVersion || !at || !Number.isFinite(Date.parse(at))) return null;
  const statut = typeof event.statut === 'string' ? event.statut : '';
  const locale = typeof event.locale === 'string' ? event.locale : '';
  const scheme = typeof event.scheme === 'string' ? event.scheme : '';
  const platform = typeof event.platform === 'string' ? event.platform : '';
  if (!STATUTS.has(statut) || !LOCALES.has(locale) || !SCHEMES.has(scheme) || !PLATFORMS.has(platform)) return null;
  const propsSource = event.props && typeof event.props === 'object' && !Array.isArray(event.props)
    ? (event.props as Record<string, unknown>)
    : undefined;
  const props = cleanProps(propsSource);
  const path = typeof event.path === 'string' ? event.path.trim().slice(0, 200) : '';
  const accepted = {
    id,
    name: name as AnalyticsEvent['name'],
    at,
    anonId,
    visit,
    statut: statut as AnalyticsEvent['statut'],
    locale: locale as AnalyticsEvent['locale'],
    scheme: scheme as AnalyticsEvent['scheme'],
    platform: platform as AnalyticsEvent['platform'],
    appVersion,
    path: path || undefined,
    props,
  } satisfies AnalyticsEvent;
  return {
    id: accepted.id,
    name: accepted.name,
    at: new Date(accepted.at).toISOString(),
    anon_id: accepted.anonId,
    visit: accepted.visit,
    statut: accepted.statut,
    locale: accepted.locale,
    scheme: accepted.scheme,
    platform: accepted.platform,
    app_version: accepted.appVersion,
    path: accepted.path ?? null,
    props: accepted.props ?? null,
  };
}

export function parseEventBatch(body: unknown): { ok: true; events: StoredEvent[] } | { ok: false; error: string } {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return { ok: false, error: 'lot_invalide' };
  const events = (body as { events?: unknown }).events;
  if (!Array.isArray(events)) return { ok: false, error: 'lot_invalide' };
  if (events.length > 100) return { ok: false, error: 'trop_d_evenements' };
  const seen = new Set<string>();
  const accepted: StoredEvent[] = [];
  for (const item of events) {
    const parsed = parseOne(item);
    if (!parsed || seen.has(parsed.id)) continue;
    seen.add(parsed.id);
    accepted.push(parsed);
  }
  return { ok: true, events: accepted };
}
