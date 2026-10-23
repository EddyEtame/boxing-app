import type { ClubId } from '@bc/brand';
import type { AnalyticsEvent, Statut } from '@bc/contract';

import { appendLines, fileStat, readText, replaceText } from './store';
import { isClubId } from '@/lib/clubs';
import type { StoredEvent } from '@/lib/events';

/**
 * La mesure d'usage : un fichier JSON lines gitignoré (.data/evenements.jsonl),
 * une ligne par événement, et les agrégats que montre la page « Statistiques ».
 * D'abord les non-membres (statut « invite » : la vitrine), puis les adhérents.
 */
export const EVENTS_FILE = 'evenements.jsonl';

const g = globalThis as typeof globalThis & { __bcaSeen?: { set: Set<string>; order: string[] }; __bcaEvents?: { key: string; rows: StoredEvent[] } };
const seen = (g.__bcaSeen ??= { set: new Set(), order: [] });

/** Un même événement renvoyé deux fois (réseau coupé au mauvais moment) n'est compté qu'une fois. */
function firstTime(id: string): boolean {
  if (seen.set.has(id)) return false;
  seen.set.add(id);
  seen.order.push(id);
  if (seen.order.length > 50_000) seen.set.delete(seen.order.shift()!);
  return true;
}

export async function appendEvents(events: AnalyticsEvent[], source: 'app' | 'demo', receivedAt = new Date()): Promise<number> {
  const r = receivedAt.toISOString();
  const lines = events.filter((e) => firstTime(e.id)).map((e) => JSON.stringify({ e, r, s: source } satisfies StoredEvent));
  await appendLines(EVENTS_FILE, lines);
  return lines.length;
}

export async function readEvents(): Promise<StoredEvent[]> {
  const st = await fileStat(EVENTS_FILE);
  if (!st) return [];
  const key = `${st.size}:${st.mtimeMs}`;
  if (g.__bcaEvents?.key === key) return g.__bcaEvents.rows;
  const text = (await readText(EVENTS_FILE)) ?? '';
  const rows: StoredEvent[] = [];
  for (const line of text.split('\n')) {
    if (!line) continue;
    try {
      const row = JSON.parse(line) as StoredEvent;
      if (row?.e?.name && row.e.at) rows.push(row);
    } catch {
      // Ligne abîmée (écriture coupée) : ignorée, les autres restent lisibles.
    }
  }
  g.__bcaEvents = { key, rows };
  return rows;
}

/** Retire les graines de démonstration et garde tout ce qui vient de l'app. */
export async function purgeDemoEvents(): Promise<number> {
  const rows = await readEvents();
  const keep = rows.filter((r) => r.s !== 'demo');
  await replaceText(EVENTS_FILE, keep.map((r) => JSON.stringify(r)).join('\n') + (keep.length ? '\n' : ''));
  return rows.length - keep.length;
}

/* ------------------------------------------------------------------ */
/* Les agrégats                                                         */
/* ------------------------------------------------------------------ */

const dayFmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' });
const dayOf = (iso: string) => dayFmt.format(new Date(iso));

type Count = { views: number; visitors: number };
const count = (m: Map<string, Set<string> & { views?: number }>, key: string, anon: string) => {
  let s = m.get(key) as (Set<string> & { views?: number }) | undefined;
  if (!s) {
    s = new Set() as Set<string> & { views?: number };
    s.views = 0;
    m.set(key, s);
  }
  s.add(anon);
  s.views = (s.views ?? 0) + 1;
};
const toList = (m: Map<string, Set<string> & { views?: number }>) => [...m.entries()].map(([key, s]) => ({ key, views: s.views ?? 0, visitors: s.size })).sort((a, b) => b.views - a.views);

export const FUNNEL_STEPS = ['open', 'ambiance', 'profil', 'done', 'explore', 'cta'] as const;
export type FunnelKey = (typeof FUNNEL_STEPS)[number];

export type AudienceReport = {
  visitors: number;
  visits: number;
  events: number;
  perDay: { day: string; visits: number; visitors: number }[];
  sections: ({ key: string } & Count)[];
  screens: ({ key: string } & Count)[];
  locales: Record<'fr' | 'en', number>;
  schemes: Record<'light' | 'dark', number>;
  platforms: Record<'ios' | 'android' | 'web', number>;
};

export type GuestReport = AudienceReport & {
  funnel: { key: FunnelKey; value: number }[];
  prefaceChoice: { guest: number; member: number };
  plannings: { club: ClubId; views: number; visitors: number; shares: number; sessions: number }[];
  cta: { clickers: number; clicks: number; rate: number; from: { key: string; count: number }[]; signIn: number };
  offers: { key: string; count: number }[];
};

export type MemberReport = AudienceReport & {
  byStatut: Record<'actif' | 'restreint', number>;
  actions: { key: 'badge_open' | 'stats_view' | 'message_send' | 'training_join' | 'training_publish' | 'video_open' | 'session_favorite' | 'bar_save'; count: number; visitors: number }[];
};

export type UsageReport = {
  periodDays: number;
  from: string;
  to: string;
  totals: { all: number; demo: number; app: number; inPeriod: number };
  lastEventAt: string | null;
  lastAppEventAt: string | null;
  /** Le plus ancien événement compté : sur 90 jours, il dit que les données commencent plus tard que la période. */
  firstInPeriodAt: string | null;
  guests: GuestReport;
  members: MemberReport;
  versions: { key: string; count: number }[];
};

function emptyAudience(days: string[]): AudienceReport {
  return {
    visitors: 0,
    visits: 0,
    events: 0,
    perDay: days.map((day) => ({ day, visits: 0, visitors: 0 })),
    sections: [],
    screens: [],
    locales: { fr: 0, en: 0 },
    schemes: { light: 0, dark: 0 },
    platforms: { ios: 0, android: 0, web: 0 },
  };
}

/** Les agrégats d'une période. `includeDemo` à faux : seulement ce que l'app a vraiment envoyé. */
export async function usageReport(periodDays: number, includeDemo: boolean, now = new Date()): Promise<UsageReport> {
  const rows = await readEvents();
  const start = new Date(now.getTime() - periodDays * 86_400_000);
  const days: string[] = [];
  for (let i = periodDays - 1; i >= 0; i--) days.push(dayOf(new Date(now.getTime() - i * 86_400_000).toISOString()));

  const guests = { ...emptyAudience(days), funnel: [], prefaceChoice: { guest: 0, member: 0 }, plannings: [], cta: { clickers: 0, clicks: 0, rate: 0, from: [], signIn: 0 }, offers: [] } as GuestReport;
  const members = { ...emptyAudience(days), byStatut: { actif: 0, restreint: 0 }, actions: [] } as MemberReport;

  const anon = { invite: new Set<string>(), member: new Set<string>(), actif: new Set<string>(), restreint: new Set<string>() };
  const visits = { invite: new Set<string>(), member: new Set<string>() };
  const perDay = { invite: new Map<string, { v: Set<string>; a: Set<string> }>(), member: new Map<string, { v: Set<string>; a: Set<string> }>() };
  const sections = { invite: new Map(), member: new Map() } as Record<'invite' | 'member', Map<string, Set<string> & { views?: number }>>;
  const screens = { invite: new Map(), member: new Map() } as Record<'invite' | 'member', Map<string, Set<string> & { views?: number }>>;
  const reached: Record<FunnelKey, Set<string>> = { open: new Set(), ambiance: new Set(), profil: new Set(), done: new Set(), explore: new Set(), cta: new Set() };
  const plan = new Map<ClubId, { views: number; visitors: Set<string>; shares: number; sessions: number }>();
  const ctaFrom = new Map<string, number>();
  const offers = new Map<string, number>();
  const actionsCount = new Map<MemberReport['actions'][number]['key'], { n: number; who: Set<string> }>();
  const versions = new Map<string, number>();
  let demo = 0;
  let inPeriod = 0;
  let last: string | null = null;
  let lastApp: string | null = null;
  let firstIn: string | null = null;

  for (const row of rows) {
    if (row.s === 'demo') demo++;
    if (!last || row.e.at > last) last = row.e.at;
    if (row.s === 'app' && (!lastApp || row.e.at > lastApp)) lastApp = row.e.at;
    if (!includeDemo && row.s === 'demo') continue;
    const e = row.e;
    const at = new Date(e.at);
    if (at < start || at > now) continue;
    inPeriod++;
    if (!firstIn || e.at < firstIn) firstIn = e.at;
    const who: 'invite' | 'member' = e.statut === 'invite' ? 'invite' : 'member';
    const audience = who === 'invite' ? guests : members;
    audience.events++;
    anon[who].add(e.anonId);
    if (e.statut !== 'invite') anon[e.statut as Exclude<Statut, 'invite'>].add(e.anonId);
    visits[who].add(e.visit);
    const day = dayOf(e.at);
    let d = perDay[who].get(day);
    if (!d) perDay[who].set(day, (d = { v: new Set(), a: new Set() }));
    d.v.add(e.visit);
    d.a.add(e.anonId);
    audience.locales[e.locale]++;
    audience.schemes[e.scheme]++;
    audience.platforms[e.platform]++;
    versions.set(e.appVersion, (versions.get(e.appVersion) ?? 0) + 1);
    const p = e.props ?? {};

    if (e.name === 'screen_view') {
      const section = typeof p.section === 'string' ? p.section : (e.path?.split('/')[1] ?? 'home') || 'home';
      count(sections[who], section, e.anonId);
      if (e.path) count(screens[who], e.path, e.anonId);
    }

    if (who === 'invite') {
      // L'entonnoir « au moins arrivé jusque-là » : passer la préface n'est pas un abandon.
      const step = Number(p.step);
      if (e.name === 'app_open') reached.open.add(e.anonId);
      if (e.name === 'preface_step' && step >= 2) reached.ambiance.add(e.anonId);
      if (e.name === 'preface_step' && step >= 3) reached.profil.add(e.anonId);
      if (e.name === 'preface_done') {
        reached.done.add(e.anonId);
        if (p.choice === 'member') guests.prefaceChoice.member++;
        else guests.prefaceChoice.guest++;
      }
      if (e.name === 'screen_view') reached.explore.add(e.anonId);
      if (e.name === 'cta_create_account') {
        reached.cta.add(e.anonId);
        guests.cta.clicks++;
        const from = typeof p.from === 'string' ? p.from : 'autre';
        ctaFrom.set(from, (ctaFrom.get(from) ?? 0) + 1);
      }
      if (e.name === 'cta_sign_in') guests.cta.signIn++;
      if (e.name === 'offer_open' && typeof p.value === 'string') offers.set(p.value, (offers.get(p.value) ?? 0) + 1);
      if ((e.name === 'planning_view' || e.name === 'planning_share' || e.name === 'planning_session_open' || e.name === 'session_share') && isClubId(p.club)) {
        let c = plan.get(p.club);
        if (!c) plan.set(p.club, (c = { views: 0, visitors: new Set(), shares: 0, sessions: 0 }));
        if (e.name === 'planning_view') {
          c.views++;
          c.visitors.add(e.anonId);
        }
        if (e.name === 'planning_share' || e.name === 'session_share') c.shares++;
        if (e.name === 'planning_session_open') c.sessions++;
      }
    } else if (['badge_open', 'stats_view', 'message_send', 'training_join', 'training_publish', 'video_open', 'session_favorite', 'bar_save'].includes(e.name)) {
      const key = e.name as MemberReport['actions'][number]['key'];
      let a = actionsCount.get(key);
      if (!a) actionsCount.set(key, (a = { n: 0, who: new Set() }));
      a.n++;
      a.who.add(e.anonId);
    }
  }

  // Monotone : qui a touché « Créer mon compte » a forcément exploré, etc.
  const order = [...FUNNEL_STEPS];
  for (let i = order.length - 2; i >= 0; i--) for (const a of reached[order[i + 1]!]) reached[order[i]!].add(a);

  guests.visitors = anon.invite.size;
  guests.visits = visits.invite.size;
  guests.perDay = days.map((day) => ({ day, visits: perDay.invite.get(day)?.v.size ?? 0, visitors: perDay.invite.get(day)?.a.size ?? 0 }));
  guests.sections = toList(sections.invite);
  guests.screens = toList(screens.invite).slice(0, 12);
  guests.funnel = order.map((key) => ({ key, value: reached[key].size }));
  guests.plannings = [...plan.entries()].map(([club, c]) => ({ club, views: c.views, visitors: c.visitors.size, shares: c.shares, sessions: c.sessions })).sort((a, b) => b.views - a.views);
  guests.cta.clickers = reached.cta.size;
  guests.cta.rate = guests.visitors ? reached.cta.size / guests.visitors : 0;
  guests.cta.from = [...ctaFrom.entries()].map(([key, n]) => ({ key, count: n })).sort((a, b) => b.count - a.count);
  guests.offers = [...offers.entries()].map(([key, n]) => ({ key, count: n })).sort((a, b) => b.count - a.count);

  members.visitors = anon.member.size;
  members.visits = visits.member.size;
  members.byStatut = { actif: anon.actif.size, restreint: anon.restreint.size };
  members.perDay = days.map((day) => ({ day, visits: perDay.member.get(day)?.v.size ?? 0, visitors: perDay.member.get(day)?.a.size ?? 0 }));
  members.sections = toList(sections.member);
  members.screens = toList(screens.member).slice(0, 12);
  members.actions = [...actionsCount.entries()].map(([key, a]) => ({ key, count: a.n, visitors: a.who.size })).sort((a, b) => b.count - a.count);

  return {
    periodDays,
    from: start.toISOString(),
    to: now.toISOString(),
    totals: { all: rows.length, demo, app: rows.length - demo, inPeriod },
    lastEventAt: last,
    lastAppEventAt: lastApp,
    firstInPeriodAt: firstIn,
    guests,
    members,
    versions: [...versions.entries()].map(([key, n]) => ({ key, count: n })).sort((a, b) => b.count - a.count),
  };
}

/** Combien d'installations correspondent à une cible (clubs × statuts), sur 30 jours : la portée d'une notification. */
export async function reachFor(target: { clubs: ClubId[] | 'all'; statuts: Statut[] }, now = new Date()): Promise<{ installs: number; measured: boolean }> {
  const rows = await readEvents();
  const since = now.getTime() - 30 * 86_400_000;
  const lastStatut = new Map<string, Statut>();
  const clubsOf = new Map<string, Set<ClubId>>();
  for (const r of rows) {
    const at = Date.parse(r.e.at);
    if (at < since) continue;
    lastStatut.set(r.e.anonId, r.e.statut);
    const club = r.e.props?.club;
    if (isClubId(club)) {
      let s = clubsOf.get(r.e.anonId);
      if (!s) clubsOf.set(r.e.anonId, (s = new Set()));
      s.add(club);
    }
  }
  let n = 0;
  for (const [anonId, statut] of lastStatut) {
    if (!target.statuts.includes(statut)) continue;
    if (target.clubs !== 'all') {
      const s = clubsOf.get(anonId);
      if (!s || !target.clubs.some((c) => s.has(c))) continue;
    }
    n++;
  }
  return { installs: n, measured: rows.length > 0 };
}
