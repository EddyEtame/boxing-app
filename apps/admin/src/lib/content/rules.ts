import { AUDIENCES_OK, isEventKind, isFamilleVideo, isNewsKind, isNiveau, isObjectif, isSecurite } from './enums';
import { LIMITS, type EventDraft, type NewsDraft, type PublishMode, type VideoDraft } from './types';
import { isClubId } from '@/lib/clubs';
import type { ClubEvent, Media, NewsItem, PublishStatus, VideoItem } from '@/lib/types';

/**
 * Les règles des contenus, les mêmes dans le navigateur et sur le serveur :
 * l'assistant les applique pour guider, l'action serveur les réapplique parce
 * qu'elle ne fait jamais confiance au navigateur.
 *
 * Une erreur est un code : `clé` ou `clé:max=90`. Le navigateur le traduit
 * (`errorText`), le serveur le renvoie tel quel dans `fieldErrors`.
 */
export type Errs = Record<string, string>;

/* ------------------------------------------------------------------ */
/* L'heure de Toulouse, quel que soit le serveur                        */
/* ------------------------------------------------------------------ */

const TZ = 'Europe/Paris';

function parisParts(at: Date): { y: number; m: number; d: number; h: number; mi: number } {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: TZ, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).formatToParts(at);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  return { y: get('year'), m: get('month'), d: get('day'), h: get('hour') % 24, mi: get('minute') };
}

const pad = (n: number) => String(n).padStart(2, '0');

/** « 2026-10-22 », aujourd'hui à Toulouse. */
export function todayParis(now: Date = new Date()): string {
  const p = parisParts(now);
  return `${p.y}-${pad(p.m)}-${pad(p.d)}`;
}

/** « 2026-10-22T18:30 », l'heure murale de Toulouse : se compare comme une chaîne. */
export function wallNowParis(now: Date = new Date()): string {
  const p = parisParts(now);
  return `${p.y}-${pad(p.m)}-${pad(p.d)}T${pad(p.h)}:${pad(p.mi)}`;
}

/** L'instant qui correspond à « telle date, telle heure, à Toulouse » (heure d'été comprise). */
export function parisToInstant(ymd: string, hm: string): Date | null {
  if (!isYmd(ymd) || !isHm(hm)) return null;
  const [y, m, d] = ymd.split('-').map(Number) as [number, number, number];
  const [h, mi] = hm.split(':').map(Number) as [number, number];
  const guess = Date.UTC(y, m - 1, d, h, mi);
  const p = parisParts(new Date(guess));
  const offset = Date.UTC(p.y, p.m - 1, p.d, p.h, p.mi) - guess;
  return new Date(guess - offset);
}

/** Le mur de Toulouse d'un instant : { date, heure }. */
export function instantToParis(iso: string): { date: string; time: string } {
  const p = parisParts(new Date(iso));
  return { date: `${p.y}-${pad(p.m)}-${pad(p.d)}`, time: `${pad(p.h)}:${pad(p.mi)}` };
}

export function isYmd(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, m, d] = s.split('-').map(Number) as [number, number, number];
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d && y >= 2000 && y <= 2100;
}

export function isHm(s: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(s);
}

/**
 * Une heure murale (« 2026-10-25T18:30 » ou « 2026-10-25 ») mise en forme sans
 * conversion de fuseau : l'heure écrite est l'heure lue, partout.
 */
export function fmtWall(locale: 'fr' | 'en', wall: string, opts: Intl.DateTimeFormatOptions): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?$/.exec(wall);
  if (!m) return '—';
  const date = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(m[4] ?? 12), Number(m[5] ?? 0)));
  return new Intl.DateTimeFormat(locale === 'fr' ? 'fr-FR' : 'en-GB', { timeZone: 'UTC', ...opts }).format(date);
}

/* ------------------------------------------------------------------ */
/* Statut réel : une publication programmée passe en ligne à son heure  */
/* ------------------------------------------------------------------ */

type Publishable = { status: PublishStatus; publishAt?: string; publishedAt?: string };

/** Calculé à la lecture : pas de tâche planifiée, pas d'oubli possible. */
export function liveStatus<T extends Publishable>(item: T, now: number): T {
  if (item.status === 'programme' && item.publishAt && Date.parse(item.publishAt) <= now) return { ...item, status: 'publie', publishedAt: item.publishAt };
  return item;
}

/* ------------------------------------------------------------------ */
/* Adresses et textes                                                   */
/* ------------------------------------------------------------------ */

/** https seulement, un vrai nom d'hôte, jamais d'identifiants dans l'adresse. */
export function isHttpsUrl(raw: string): boolean {
  const s = raw.trim();
  if (!s || s.length > LIMITS.url || /\s/.test(s)) return false;
  try {
    const u = new URL(s);
    return u.protocol === 'https:' && u.hostname.includes('.') && !u.username && !u.password;
  } catch {
    return false;
  }
}

/** Identifiant Cloudflare Stream : 32 caractères hexadécimaux. */
export function isStreamId(raw: string): boolean {
  return /^[a-f0-9]{32}$/i.test(raw.trim());
}

const tooLong = (s: string, max: number) => s.trim().length > max;
const blank = (s: string | undefined | null) => !s || !s.trim();

function checkMedia(errs: Errs, field: string, media: Media | null, required: boolean) {
  if (!media) {
    if (required) errs[field] = 'contenu.err.photo';
    return;
  }
  if (!/^[a-z0-9][a-z0-9._-]{0,120}\.(jpe?g|png|webp)$/i.test(media.file) || (media.kind !== 'photo' && media.kind !== 'upload')) errs[field] = 'contenu.err.photo';
  else if (blank(media.alt)) errs.alt = 'contenu.err.alt';
  else if (tooLong(media.alt, LIMITS.alt)) errs.alt = `form.tooLong:max=${LIMITS.alt}`;
}

function checkPublication(errs: Errs, mode: PublishMode, date: string, time: string, now: number, allowSchedule = true) {
  if (mode !== 'publie' && mode !== 'brouillon' && !(allowSchedule && mode === 'programme')) {
    errs.mode = 'contenu.err.mode';
    return;
  }
  if (mode !== 'programme') return;
  const at = parisToInstant(date, time);
  if (!at) {
    if (!isYmd(date)) errs.publishDate = 'form.date';
    else errs.publishTime = 'contenu.err.time';
    return;
  }
  if (at.getTime() <= now + 60_000) errs.publishDate = 'contenu.err.past';
  else if (at.getTime() > now + 366 * 86_400_000) errs.publishDate = 'contenu.err.far';
}

/* ------------------------------------------------------------------ */
/* Actualités                                                           */
/* ------------------------------------------------------------------ */

export function checkNews(d: NewsDraft, now: number): Errs {
  const e: Errs = {};
  if (!d.kind || !isNewsKind(d.kind)) e.kind = 'contenu.err.kind';
  if (blank(d.title)) e.title = 'form.required';
  else if (tooLong(d.title, LIMITS.newsTitle)) e.title = `form.tooLong:max=${LIMITS.newsTitle}`;
  if (blank(d.body)) e.body = 'form.required';
  else if (tooLong(d.body, LIMITS.newsBody)) e.body = `form.tooLong:max=${LIMITS.newsBody}`;
  if (!isYmd(d.date)) e.date = 'form.date';
  if (d.club !== 'reseau' && !isClubId(d.club)) e.club = 'contenu.err.club';
  if (!AUDIENCES_OK.includes(d.audience)) e.audience = 'contenu.err.audience';
  checkMedia(e, 'photo', d.photo, true);
  if (!blank(d.video) && !isHttpsUrl(d.video)) e.video = 'form.url';
  if (!blank(d.linkUrl) && !isHttpsUrl(d.linkUrl)) e.linkUrl = 'form.url';
  if (!blank(d.linkUrl) && blank(d.linkLabel)) e.linkLabel = 'contenu.err.linkLabel';
  else if (tooLong(d.linkLabel, LIMITS.linkLabel)) e.linkLabel = `form.tooLong:max=${LIMITS.linkLabel}`;
  if (blank(d.linkUrl) && !blank(d.linkLabel)) e.linkUrl = 'contenu.err.linkUrl';
  checkPublication(e, d.mode, d.publishDate, d.publishTime, now);
  return e;
}

/* ------------------------------------------------------------------ */
/* Événements                                                           */
/* ------------------------------------------------------------------ */

/** Un combat se décrit toujours ; un gala peut afficher son combat principal. */
export const fightRequired = (d: Pick<EventDraft, 'kind'>) => d.kind === 'combat';
export const fightAllowed = (d: Pick<EventDraft, 'kind'>) => d.kind === 'combat' || d.kind === 'gala';

export function checkEvent(d: EventDraft, now: number): Errs {
  const e: Errs = {};
  if (!d.kind || !isEventKind(d.kind)) e.kind = 'contenu.err.kind';
  if (blank(d.title)) e.title = 'form.required';
  else if (tooLong(d.title, LIMITS.eventTitle)) e.title = `form.tooLong:max=${LIMITS.eventTitle}`;
  if (tooLong(d.body, LIMITS.eventBody)) e.body = `form.tooLong:max=${LIMITS.eventBody}`;
  if (!isYmd(d.startDate)) e.startDate = 'form.date';
  if (!isHm(d.startTime)) e.startTime = 'contenu.err.time';
  if (d.hasEnd) {
    if (!isYmd(d.endDate)) e.endDate = 'form.date';
    else if (!isHm(d.endTime)) e.endTime = 'contenu.err.time';
    else if (!e.startDate && !e.startTime) {
      const start = `${d.startDate}T${d.startTime}`;
      const end = `${d.endDate}T${d.endTime}`;
      if (end <= start) e.endDate = 'evt.err.endBefore';
      else if (Date.parse(`${d.endDate}T00:00Z`) - Date.parse(`${d.startDate}T00:00Z`) > 31 * 86_400_000) e.endDate = 'evt.err.tooLong';
    }
  }
  if (d.club !== 'aucun' && !isClubId(d.club)) e.club = 'contenu.err.club';
  if (d.club === 'aucun' && blank(d.venue)) e.venue = 'evt.err.place';
  if (tooLong(d.venue, LIMITS.venue)) e.venue = `form.tooLong:max=${LIMITS.venue}`;
  if (fightRequired(d) || (fightAllowed(d) && d.withFight)) {
    const f = d.fight;
    if (blank(f.fighter)) e.fighter = 'form.required';
    else if (tooLong(f.fighter, LIMITS.person)) e.fighter = `form.tooLong:max=${LIMITS.person}`;
    if (blank(f.opponent)) e.opponent = 'form.required';
    else if (tooLong(f.opponent, LIMITS.person)) e.opponent = `form.tooLong:max=${LIMITS.person}`;
    if (tooLong(f.weightClass, LIMITS.weightClass)) e.weightClass = `form.tooLong:max=${LIMITS.weightClass}`;
    if (tooLong(f.title, LIMITS.beltTitle)) e.beltTitle = `form.tooLong:max=${LIMITS.beltTitle}`;
    if (tooLong(f.broadcaster, LIMITS.broadcaster)) e.broadcaster = `form.tooLong:max=${LIMITS.broadcaster}`;
  }
  if (!blank(d.ticketUrl) && !isHttpsUrl(d.ticketUrl)) e.ticketUrl = 'form.url';
  checkMedia(e, 'photo', d.photo, true);
  if (!AUDIENCES_OK.includes(d.audience)) e.audience = 'contenu.err.audience';
  checkPublication(e, d.mode, d.publishDate, d.publishTime, now);
  return e;
}

/* ------------------------------------------------------------------ */
/* Vidéos                                                               */
/* ------------------------------------------------------------------ */

export function checkVideo(d: VideoDraft, takenNumbers: number[] = []): Errs {
  const e: Errs = {};
  if (!d.famille || !isFamilleVideo(d.famille)) e.famille = 'vid.err.famille';
  if (blank(d.title)) e.title = 'form.required';
  else if (tooLong(d.title, LIMITS.videoTitle)) e.title = `form.tooLong:max=${LIMITS.videoTitle}`;
  if (tooLong(d.coach, LIMITS.coach)) e.coach = `form.tooLong:max=${LIMITS.coach}`;
  if (!Number.isInteger(d.numero) || d.numero < 1 || d.numero > 999) e.numero = 'form.number:min=1,max=999';
  else if (takenNumbers.includes(d.numero)) e.numero = 'vid.err.numero';
  if (!isNiveau(d.niveau)) e.niveau = 'vid.err.niveau';
  if (!Number.isInteger(d.dureeMin) || d.dureeMin < 1 || d.dureeMin > 180) e.dureeMin = 'form.number:min=1,max=180';
  if (!d.objectif || !isObjectif(d.objectif)) e.objectif = 'vid.err.objectif';
  if (!d.securite || !isSecurite(d.securite)) e.securite = 'vid.err.securite';
  // CDC §11E : une opposition ne se fait que dans les conditions d'encadrement du club.
  else if (d.objectif === 'Sparring' && d.securite !== 'encadrement') e.securite = 'vid.err.sparring';
  if (d.sourceKind === 'stream' && !isStreamId(d.sourceRef)) e.sourceRef = 'vid.err.stream';
  if (d.sourceKind === 'url' && !isHttpsUrl(d.sourceRef)) e.sourceRef = 'form.url';
  if (d.sourceKind !== 'stream' && d.sourceKind !== 'url' && d.sourceKind !== 'aucune') e.sourceRef = 'vid.err.source';
  checkMedia(e, 'poster', d.poster, true);
  if (d.mode !== 'publie' && d.mode !== 'brouillon') e.mode = 'contenu.err.mode';
  else if (d.mode === 'publie' && d.sourceKind === 'aucune') e.mode = 'vid.err.noSource';
  return e;
}

/* ------------------------------------------------------------------ */
/* D'un élément enregistré à l'assistant                                */
/* ------------------------------------------------------------------ */

function publicationOf(item: { status: PublishStatus; publishAt?: string }, today: string): { mode: PublishMode; publishDate: string; publishTime: string } {
  if (item.status === 'programme' && item.publishAt) {
    const w = instantToParis(item.publishAt);
    return { mode: 'programme', publishDate: w.date, publishTime: w.time };
  }
  return { mode: item.status === 'brouillon' ? 'brouillon' : 'publie', publishDate: today, publishTime: '18:00' };
}

export function newsToDraft(n: NewsItem, today: string): NewsDraft {
  return {
    id: n.id,
    rev: n.updatedAt,
    kind: n.kind,
    title: n.title,
    body: n.body,
    date: n.date,
    club: n.club ?? 'reseau',
    audience: n.audience,
    important: n.important,
    photo: n.photo ?? null,
    video: n.video ?? '',
    linkUrl: n.link?.url ?? '',
    linkLabel: n.link?.label ?? '',
    ...publicationOf(n, today),
  };
}

export function eventToDraft(ev: ClubEvent, today: string): EventDraft {
  const [startDate = today, startTime = '18:00'] = ev.startsAt.split('T');
  const [endDate = '', endTime = ''] = (ev.endsAt ?? '').split('T');
  return {
    id: ev.id,
    rev: ev.updatedAt,
    kind: ev.kind,
    title: ev.title,
    body: ev.body,
    startDate,
    startTime,
    hasEnd: Boolean(ev.endsAt),
    endDate: endDate || startDate,
    endTime: endTime || '22:00',
    club: ev.club ?? 'aucun',
    venue: ev.venue ?? '',
    withFight: Boolean(ev.fight),
    fight: { fighter: ev.fight?.fighter ?? '', opponent: ev.fight?.opponent ?? '', weightClass: ev.fight?.weightClass ?? '', title: ev.fight?.title ?? '', broadcaster: ev.fight?.broadcaster ?? '' },
    ticketUrl: ev.ticketUrl ?? '',
    photo: ev.photo ?? null,
    audience: ev.audience,
    important: ev.important,
    ...publicationOf(ev, today),
  };
}

export function videoToDraft(v: VideoItem): VideoDraft {
  return {
    id: v.id,
    rev: v.updatedAt,
    famille: v.famille,
    title: v.title,
    coach: v.coach ?? '',
    numero: v.numero,
    niveau: v.niveau,
    dureeMin: v.dureeMin,
    objectif: v.objectif,
    securite: v.securite,
    sourceKind: v.source.ref ? v.source.kind : 'aucune',
    sourceRef: v.source.ref,
    poster: v.poster ?? null,
    gratuite: v.gratuite,
    mode: v.status === 'brouillon' ? 'brouillon' : 'publie',
  };
}

/** Les champs de chaque étape : une erreur renvoyée par le serveur rouvre la bonne étape. */
export function stepOfField(map: Record<string, string[]>, field: string): string | undefined {
  return Object.entries(map).find(([, fields]) => fields.includes(field))?.[0];
}

export function pick(errs: Errs, fields: string[]): Errs {
  const out: Errs = {};
  for (const f of fields) if (errs[f]) out[f] = errs[f]!;
  return out;
}

/* ------------------------------------------------------------------ */
/* Ce qui arrive du navigateur : remis en forme avant d'être jugé       */
/* ------------------------------------------------------------------ */

const s = (v: unknown, max = 4000): string => (typeof v === 'string' ? v.slice(0, max) : '');
const b = (v: unknown): boolean => v === true;
const n = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? v : Number.NaN);
const media = (v: unknown): Media | null => {
  const o = v as Record<string, unknown> | null;
  if (!o || typeof o !== 'object') return null;
  if (o.kind !== 'photo' && o.kind !== 'upload') return null;
  return { kind: o.kind, file: s(o.file, 200), alt: s(o.alt, 400) };
};
const mode = (v: unknown): PublishMode => (v === 'programme' || v === 'brouillon' ? v : 'publie');
const rec = (v: unknown): Record<string, unknown> => (v && typeof v === 'object' ? (v as Record<string, unknown>) : {});

/** Une liste d'identifiants venue du navigateur : des chaînes courtes, sans doublon, 200 au plus. */
export function asIds(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return [...new Set(v.filter((x): x is string => typeof x === 'string' && x.length > 0 && x.length <= 80))].slice(0, 200);
}

export function asNewsDraft(raw: unknown): NewsDraft {
  const o = rec(raw);
  return {
    id: typeof o.id === 'string' ? o.id.slice(0, 80) : undefined,
    rev: typeof o.rev === 'string' ? o.rev.slice(0, 40) : undefined,
    kind: isNewsKind(o.kind) ? o.kind : null,
    title: s(o.title, 400),
    body: s(o.body, 8000),
    date: s(o.date, 10),
    club: isClubId(o.club) ? o.club : 'reseau',
    audience: o.audience === 'actifs' ? 'actifs' : 'tous',
    important: b(o.important),
    photo: media(o.photo),
    video: s(o.video, 600),
    linkUrl: s(o.linkUrl, 600),
    linkLabel: s(o.linkLabel, 200),
    mode: mode(o.mode),
    publishDate: s(o.publishDate, 10),
    publishTime: s(o.publishTime, 5),
  };
}

export function asEventDraft(raw: unknown): EventDraft {
  const o = rec(raw);
  const f = rec(o.fight);
  return {
    id: typeof o.id === 'string' ? o.id.slice(0, 80) : undefined,
    rev: typeof o.rev === 'string' ? o.rev.slice(0, 40) : undefined,
    kind: isEventKind(o.kind) ? o.kind : null,
    title: s(o.title, 400),
    body: s(o.body, 6000),
    startDate: s(o.startDate, 10),
    startTime: s(o.startTime, 5),
    hasEnd: b(o.hasEnd),
    endDate: s(o.endDate, 10),
    endTime: s(o.endTime, 5),
    club: isClubId(o.club) ? o.club : 'aucun',
    venue: s(o.venue, 400),
    withFight: b(o.withFight),
    fight: { fighter: s(f.fighter, 200), opponent: s(f.opponent, 200), weightClass: s(f.weightClass, 200), title: s(f.title, 200), broadcaster: s(f.broadcaster, 200) },
    ticketUrl: s(o.ticketUrl, 600),
    photo: media(o.photo),
    audience: o.audience === 'actifs' ? 'actifs' : 'tous',
    important: b(o.important),
    mode: mode(o.mode),
    publishDate: s(o.publishDate, 10),
    publishTime: s(o.publishTime, 5),
  };
}

export function asVideoDraft(raw: unknown): VideoDraft {
  const o = rec(raw);
  return {
    id: typeof o.id === 'string' ? o.id.slice(0, 80) : undefined,
    rev: typeof o.rev === 'string' ? o.rev.slice(0, 40) : undefined,
    famille: isFamilleVideo(o.famille) ? o.famille : null,
    title: s(o.title, 300),
    coach: s(o.coach, 200),
    numero: n(o.numero),
    niveau: isNiveau(o.niveau) ? o.niveau : 'Débutant',
    dureeMin: n(o.dureeMin),
    objectif: isObjectif(o.objectif) ? o.objectif : null,
    securite: isSecurite(o.securite) ? o.securite : null,
    sourceKind: o.sourceKind === 'stream' || o.sourceKind === 'url' ? o.sourceKind : 'aucune',
    sourceRef: s(o.sourceRef, 600),
    poster: media(o.poster),
    gratuite: b(o.gratuite),
    mode: o.mode === 'publie' ? 'publie' : 'brouillon',
  };
}

