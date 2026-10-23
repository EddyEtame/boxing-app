import { audit } from './audit';
import { read, update } from './collections';
import { newId } from './crypto';
import { readPlanning } from './planning';
import { reachFor } from './usage';
import { CLUB_LABEL, isClubId } from '@/lib/clubs';
import { parisToIso } from '@/lib/comms/time';
import { STATUTS, type NotifDraft, type NotifPrefill, type OutgoingDraft, type OutgoingRow, type Reach } from '@/lib/comms/types';
import { checkNotif, checkOutgoing, cleanText, type FieldErrors } from '@/lib/comms/validate';
import { TZ, parseLocal } from '@/lib/format';
import { can, inScope, scopeClubs } from '@/lib/permissions';
import { heure, normaliseActivite } from '@/lib/planning/model';
import type { ClubId, OutgoingMessage, PushNotification, SessionUser, Statut } from '@/lib/types';

/**
 * NOTIFICATIONS ET ENVOIS DE L'ÉQUIPE (CDC §10, §14).
 *
 * Le service d'envoi (Expo Push) n'est pas branché : une notification validée
 * est gardée au statut « en file », une programmation échue y passe à son
 * heure. Rien ne prétend être parti. Le jour où le service est branché, il lit
 * la file ; l'historique et la portée restent ceux d'ici.
 */

const MAX_NOTIFS = 2000;
const MAX_SENT = 2000;

/* ------------------------------------------------------------------ */
/* Outils                                                               */
/* ------------------------------------------------------------------ */

/** Coupe proprement : on ne tronque pas au milieu d'un mot quand on peut l'éviter. */
export function clip(s: string, max: number): string {
  const t = s.trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max - 1);
  const space = cut.lastIndexOf(' ');
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).trimEnd()}…`;
}

function firstSentence(s: string): string {
  const flat = cleanText(s, false);
  const m = /^(.{20,}?[.!?…])(\s|$)/.exec(flat);
  return m ? m[1]! : flat;
}

const dayLong = new Intl.DateTimeFormat('fr-FR', { timeZone: TZ, weekday: 'long', day: 'numeric', month: 'long' });

/** « 2026-10-24 » → « samedi 24 octobre » (la date seule se lit à midi : jamais la veille). */
function frDay(ymd: string): string {
  return dayLong.format(parseLocal(ymd.slice(0, 10)));
}

const JOURS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];

/** Les clubs visés, ramenés au périmètre du compte. */
function inScopeTarget(user: SessionUser, clubs: ClubId[] | 'all'): ClubId[] | 'all' {
  const scoped = scopeClubs(user, clubs);
  return scoped !== 'all' && scoped.length === 0 && user.clubs !== 'all' ? user.clubs : scoped;
}

function targetInScope(user: SessionUser, clubs: ClubId[] | 'all'): boolean {
  if (user.clubs === 'all') return true;
  return clubs !== 'all' && clubs.every((c) => inScope(user, c));
}

export async function estimateReach(target: { clubs: ClubId[] | 'all'; statuts: Statut[] }): Promise<Reach> {
  return reachFor(target);
}

/* ------------------------------------------------------------------ */
/* Notifications                                                        */
/* ------------------------------------------------------------------ */

/** Le statut tel qu'il est maintenant : une programmation dont l'heure est passée attend en file. */
function due(n: PushNotification, now: number): boolean {
  return n.status === 'programmee' && n.when.kind === 'scheduled' && Date.parse(n.when.at) <= now;
}

/** L'historique, programmations échues passées en file (et écrites, pour que tout le monde lise la même chose). */
export async function readNotifications(now = Date.now()): Promise<PushNotification[]> {
  const list = await read('notifications');
  if (!list.some((n) => due(n, now))) return list;
  return update('notifications', (cur) => {
    const next = cur.map((n) => (due(n, now) ? { ...n, status: 'en-file' as const } : n));
    return { next, result: next };
  });
}

/** Ce que voit un compte : tout le réseau, ou seulement les envois qui restent dans ses clubs. */
export function visibleNotifications(user: SessionUser, list: PushNotification[]): PushNotification[] {
  return list.filter((n) => targetInScope(user, n.target.clubs)).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function createNotification(user: SessionUser, raw: NotifDraft): Promise<{ ok: true; notif: PushNotification } | { ok: false; errors: FieldErrors }> {
  const d: NotifDraft = {
    type: raw.type,
    title: cleanText(raw.title, false),
    body: cleanText(raw.body, false),
    link: raw.link,
    clubs: raw.clubs === 'all' ? 'all' : Array.isArray(raw.clubs) ? [...new Set(raw.clubs)] : raw.clubs,
    statuts: Array.isArray(raw.statuts) ? STATUTS.filter((s) => raw.statuts.includes(s)) : raw.statuts,
    when: raw.when,
    at: typeof raw.at === 'string' ? raw.at : '',
    origin: raw.origin ?? null,
  };
  const now = Date.now();
  const errors = checkNotif(d, user.clubs, now);
  if (Object.keys(errors).length) return { ok: false, errors };
  const reach = await reachFor({ clubs: d.clubs, statuts: d.statuts });
  const scheduled = d.when === 'scheduled' ? parisToIso(d.at) : null;
  const origin = d.origin && ['news', 'event', 'video', 'planning', 'moderation'].includes(d.origin.kind) && typeof d.origin.id === 'string' && d.origin.id.length <= 120 ? { kind: d.origin.kind, id: d.origin.id } : undefined;
  const notif: PushNotification = {
    id: newId('ntf'),
    type: d.type!,
    title: d.title,
    body: d.body,
    link: d.link || undefined,
    target: { clubs: d.clubs, statuts: d.statuts },
    when: scheduled ? { kind: 'scheduled', at: scheduled } : { kind: 'now' },
    status: scheduled ? 'programmee' : 'en-file',
    reach: reach.installs,
    origin,
    createdAt: new Date(now).toISOString(),
    createdBy: user.name,
  };
  await update('notifications', (list) => ({ next: [notif, ...list].slice(0, MAX_NOTIFS), result: undefined }));
  await audit(user, scheduled ? 'notification.programmation' : 'notification.file', notif.id, `${notif.type} · ${clip(notif.title, 60)} · portée ${notif.reach}`);
  return { ok: true, notif };
}

/** Annule ce qui n'est pas parti (programmé ou en file). Renvoie les identifiants vraiment annulés. */
export async function cancelNotifications(user: SessionUser, ids: string[]): Promise<{ cancelled: string[]; skipped: number }> {
  const wanted = new Set(ids.slice(0, 500));
  const at = new Date().toISOString();
  const res = await update('notifications', (list) => {
    const cancelled: string[] = [];
    const next = list.map((n) => {
      if (!wanted.has(n.id) || (n.status !== 'programmee' && n.status !== 'en-file') || !targetInScope(user, n.target.clubs)) return n;
      cancelled.push(n.id);
      return { ...n, status: 'annulee' as const, cancelledAt: at };
    });
    return { next, result: { cancelled, skipped: wanted.size - cancelled.length } };
  });
  if (res.cancelled.length) await audit(user, 'notification.annulation', res.cancelled.length === 1 ? res.cancelled[0] : `${res.cancelled.length} notifications`);
  return res;
}

/** Défait une annulation récente (dix minutes) : la notification reprend sa place. */
export async function restoreNotifications(user: SessionUser, ids: string[]): Promise<number> {
  const wanted = new Set(ids.slice(0, 500));
  const now = Date.now();
  const n = await update('notifications', (list) => {
    let count = 0;
    const next = list.map((x) => {
      if (!wanted.has(x.id) || x.status !== 'annulee' || !x.cancelledAt || now - Date.parse(x.cancelledAt) > 10 * 60_000 || !targetInScope(user, x.target.clubs)) return x;
      count++;
      const back: PushNotification = { ...x, status: x.when.kind === 'scheduled' && Date.parse(x.when.at) > now ? 'programmee' : 'en-file' };
      delete back.cancelledAt;
      return back;
    });
    return { next, result: count };
  });
  if (n) await audit(user, 'notification.retablissement', `${n} notification(s)`);
  return n;
}

/* ------------------------------------------------------------------ */
/* Pré-remplissage depuis une actualité, un événement, une vidéo, un cours */
/* ------------------------------------------------------------------ */

const FROM = /^(news|event|video|planning):([A-Za-z0-9_-]{1,80})(?::(\d{4}-\d{2}-\d{2}))?$/;

const ALL_STATUTS: Statut[] = ['invite', 'restreint', 'actif'];

function blank(): NotifDraft {
  return { type: null, title: '', body: '', link: '', clubs: 'all', statuts: ALL_STATUTS, when: 'now', at: '', origin: null };
}

export async function prefillFrom(user: SessionUser, from: string): Promise<NotifPrefill> {
  const m = FROM.exec(from);
  if (!m) return { draft: null, missing: from.slice(0, 40) };
  const [, kind, id, date] = m as unknown as [string, 'news' | 'event' | 'video' | 'planning', string, string | undefined];
  const scope = (clubs: ClubId[] | 'all') => inScopeTarget(user, clubs);

  if (kind === 'news') {
    const item = (await read('actualites')).find((x) => x.id === id);
    if (!item) return { draft: null, missing: 'news' };
    const type = item.kind === 'promo' ? 'promo' : item.club ? 'club' : 'direction';
    return {
      source: { kind: 'news', label: item.title },
      draft: { ...blank(), type, title: clip(item.title, 50), body: clip(firstSentence(item.body), 150), link: '/actualites', clubs: scope(item.club ? [item.club] : 'all'), statuts: item.audience === 'actifs' ? ['actif'] : ALL_STATUTS, origin: { kind: 'news', id } },
    };
  }

  if (kind === 'event') {
    const ev = (await read('evenements')).find((x) => x.id === id);
    if (!ev) return { draft: null, missing: 'event' };
    const place = ev.venue ?? (ev.club ? CLUB_LABEL[ev.club] : '');
    // `startsAt` est l'heure du club écrite telle quelle (« 2026-11-14T20:00 ») : on la lit sans conversion.
    const hm = ev.startsAt.slice(11, 16);
    const when = `${frDay(ev.startsAt)}${/^\d{2}:\d{2}$/.test(hm) ? ` à ${hm.replace(':', 'h').replace(/h00$/, 'h')}` : ''}`;
    const body = ev.fight ? `${ev.fight.fighter} contre ${ev.fight.opponent} · ${when}${place ? ` · ${place}` : ''}` : `${when.charAt(0).toUpperCase()}${when.slice(1)}${place ? ` · ${place}` : ''}`;
    return {
      source: { kind: 'event', label: ev.title },
      draft: { ...blank(), type: 'evenement', title: clip(ev.title, 50), body: clip(body, 150), link: '/evenements', clubs: scope(ev.club ? [ev.club] : 'all'), statuts: ev.audience === 'actifs' ? ['actif'] : ALL_STATUTS, origin: { kind: 'event', id } },
    };
  }

  if (kind === 'video') {
    const v = (await read('videos')).find((x) => x.id === id);
    if (!v) return { draft: null, missing: 'video' };
    const body = [`${v.dureeMin} min`, v.niveau, v.objectif, v.coach ? `avec ${v.coach}` : ''].filter(Boolean).join(' · ');
    return {
      source: { kind: 'video', label: v.title },
      draft: { ...blank(), type: 'video', title: clip(`Nouvelle vidéo · ${v.title}`, 50), body: clip(body, 150), link: '/videos', clubs: scope('all'), statuts: v.gratuite ? ALL_STATUTS : ['actif'], origin: { kind: 'video', id } },
    };
  }

  const st = await readPlanning();
  const slot = st.slots.find((s) => s.id === id);
  if (!slot) return { draft: null, missing: 'planning' };
  const a = normaliseActivite(slot.activite);
  const what = `${a.libelle}${a.public ? ` (${a.public})` : ''}`;
  const where = CLUB_LABEL[slot.club];
  if (date) {
    return {
      source: { kind: 'planning', label: `${what} · ${where} · ${frDay(date)}` },
      draft: { ...blank(), type: 'club', title: clip(`Cours annulé · ${where}`, 50), body: clip(`${what} du ${frDay(date)} à ${heure(slot.debut)} n’aura pas lieu.`, 150), link: '/planning', clubs: scope([slot.club]), origin: { kind: 'planning', id: `${id}:${date}` } },
    };
  }
  return {
    source: { kind: 'planning', label: `${what} · ${where}` },
    draft: { ...blank(), type: 'club', title: clip(`Planning · ${where}`, 50), body: clip(`${what} : désormais le ${JOURS[slot.jour]} de ${heure(slot.debut)} à ${heure(slot.fin)}${slot.espace ? `, espace ${slot.espace}` : ''}.`, 150), link: '/planning', clubs: scope([slot.club]), origin: { kind: 'planning', id } },
  };
}

/* ------------------------------------------------------------------ */
/* Messages de l'équipe vers des adhérents (à sens unique, CDC §10)      */
/* ------------------------------------------------------------------ */

export async function readOutgoing(user: SessionUser): Promise<OutgoingRow[]> {
  const list = (await read('envois')) as OutgoingRow[];
  const mine = !can(user, 'messagerie');
  return list
    .filter((o) => {
      if (mine) return o.author.id === user.id;
      if (o.to.kind === 'membre') return !o.club || inScope(user, o.club);
      return targetInScope(user, o.to.clubs);
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function createOutgoing(user: SessionUser, raw: OutgoingDraft): Promise<{ ok: true; row: OutgoingRow } | { ok: false; errors: FieldErrors }> {
  const d: OutgoingDraft = {
    kind: raw.kind,
    memberId: typeof raw.memberId === 'string' ? raw.memberId.replace(/\s/g, '') : '',
    memberName: cleanText(raw.memberName, false),
    memberClub: raw.memberClub,
    clubs: raw.clubs === 'all' ? 'all' : Array.isArray(raw.clubs) ? [...new Set(raw.clubs)] : raw.clubs,
    statuts: Array.isArray(raw.statuts) ? [...new Set(raw.statuts)] : raw.statuts,
    familles: Array.isArray(raw.familles) ? [...new Set(raw.familles)] : raw.familles,
    text: cleanText(raw.text, true),
  };
  const errors = checkOutgoing(d, user.clubs);
  if (Object.keys(errors).length) return { ok: false, errors };
  const at = new Date().toISOString();
  const author = { id: user.id, name: user.name, role: user.role };
  let row: OutgoingRow;
  let notif: PushNotification | null = null;
  if (d.kind === 'membre') {
    row = { id: newId('env'), author, signature: user.signature, to: { kind: 'membre', memberId: d.memberId, memberName: d.memberName || undefined }, text: d.text, status: 'en-file', createdAt: at, club: isClubId(d.memberClub) ? d.memberClub : undefined };
  } else {
    const reach = await reachFor({ clubs: d.clubs, statuts: d.statuts });
    const id = newId('env');
    notif = {
      id: newId('ntf'),
      type: user.role === 'coach' ? 'coach' : 'direction',
      title: clip(user.signature, 50),
      body: clip(cleanText(d.text, false), 150),
      link: '/messages',
      target: { clubs: d.clubs, statuts: d.statuts },
      when: { kind: 'now' },
      status: 'en-file',
      reach: reach.installs,
      createdAt: at,
      createdBy: user.name,
    };
    row = { id, author, signature: user.signature, to: { kind: 'groupe', clubs: d.clubs, statuts: d.statuts, familles: d.familles }, text: d.text, reach: reach.installs, status: 'en-file', createdAt: at, notificationId: notif.id };
  }
  await update('envois', (list) => ({ next: [row as OutgoingMessage, ...list].slice(0, MAX_SENT), result: undefined }));
  if (notif) {
    const n = notif;
    await update('notifications', (list) => ({ next: [n, ...list].slice(0, MAX_NOTIFS), result: undefined }));
  }
  await audit(user, 'message.envoi', row.id, row.to.kind === 'membre' ? `adhérent n° ${row.to.memberId}` : `groupe · portée ${row.reach ?? 0}`);
  return { ok: true, row };
}

/**
 * Ce qui est branché, sans jamais lire une valeur : la présence d'une variable
 * ne veut pas dire que l'envoi marche (l'envoi lui-même n'est pas encore écrit),
 * seulement que la clé attend.
 */
export function deliveryStatus(): { pushKey: boolean; deciplusBridge: boolean } {
  return { pushKey: Boolean(process.env.EXPO_ACCESS_TOKEN?.trim()), deciplusBridge: Boolean(process.env.DECIPLUS_BRIDGE_URL?.trim()) };
}
