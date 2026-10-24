import { audit } from './audit';
import { read, update } from './collections';
import { newId } from './crypto';
import { ActionError } from './session';
import { frTypo } from '@/i18n/core';
import { checkEvent, checkNews, checkVideo, fightAllowed, fightRequired, liveStatus, parisToInstant, type Errs } from '@/lib/content/rules';
import type { ContentKind, EventDraft, NewsDraft, VideoDraft } from '@/lib/content/types';
import { inScope } from '@/lib/permissions';
import type { ClubEvent, ClubId, NewsItem, PublishStatus, SessionUser, VideoItem } from '@/lib/types';

/**
 * LES CONTENUS (CDC §8, §9) côté serveur : lire, enregistrer, changer de
 * statut, supprimer — et défaire. Chaque écriture repasse par les règles de
 * `lib/content/rules.ts` (le navigateur n'est jamais cru), vérifie le
 * périmètre de la personne, et laisse une ligne au journal.
 */

type ItemOf = { news: NewsItem; event: ClubEvent; video: VideoItem };
const AUDIT = { news: 'actualite', event: 'evenement', video: 'video' } as const;
const ID_PREFIX = { news: 'actu', event: 'evt', video: 'vid' } as const;

/** Une saisie refusée champ par champ : l'assistant rouvre l'étape fautive. */
export class FieldsError extends ActionError {
  constructor(public fields: Errs) {
    super('invalide');
  }
}

/* ------------------------------------------------------------------ */
/* Lecture                                                              */
/* ------------------------------------------------------------------ */

export async function readNews(now = Date.now()): Promise<NewsItem[]> {
  return (await read('actualites')).map((n) => liveStatus(n, now));
}

export async function readEvents(now = Date.now()): Promise<ClubEvent[]> {
  return (await read('evenements')).map((e) => liveStatus(e, now));
}

export async function readVideos(): Promise<VideoItem[]> {
  return read('videos');
}

async function readKind<K extends ContentKind>(kind: K): Promise<ItemOf[K][]> {
  if (kind === 'news') return (await readNews()) as ItemOf[K][];
  if (kind === 'event') return (await readEvents()) as ItemOf[K][];
  return (await readVideos()) as ItemOf[K][];
}

/** Modifie une collection de contenus ; la mutation reçoit la liste au statut réel. */
async function mutate<K extends ContentKind, R>(kind: K, fn: (list: ItemOf[K][]) => { next: ItemOf[K][]; result: R }): Promise<R> {
  const now = Date.now();
  const run = (list: ItemOf[K][]) => fn(list.map((i) => ('publishAt' in i ? liveStatus(i as NewsItem, now) : i) as ItemOf[K]));
  if (kind === 'news') return update('actualites', (l) => run(l as ItemOf[K][]) as { next: NewsItem[]; result: R });
  if (kind === 'event') return update('evenements', (l) => run(l as ItemOf[K][]) as { next: ClubEvent[]; result: R });
  return update('videos', (l) => run(l as ItemOf[K][]) as { next: VideoItem[]; result: R });
}

/** Un club précis : dans le périmètre. Tout le réseau : réservé à qui voit tout le réseau. */
export function canTouchClub(user: Pick<SessionUser, 'clubs'>, club: ClubId | null): boolean {
  return club === null ? user.clubs === 'all' : inScope(user, club);
}

function editable(user: SessionUser, kind: ContentKind, item: NewsItem | ClubEvent | VideoItem): boolean {
  if (kind === 'video') return true;
  return canTouchClub(user, (item as NewsItem | ClubEvent).club);
}

/* ------------------------------------------------------------------ */
/* Défaire                                                              */
/* ------------------------------------------------------------------ */

type UndoEntry = { userId: string; kind: ContentKind; before: (NewsItem | ClubEvent | VideoItem)[]; createdIds: string[]; expires: number };
const g = globalThis as typeof globalThis & { __bcContentUndo?: Map<string, UndoEntry> };
const undos = (g.__bcContentUndo ??= new Map<string, UndoEntry>());

/** Le navigateur ne renvoie jamais un élément pour le « défaire » : il renvoie un jeton, le serveur garde l'avant. */
function remember(user: SessionUser, kind: ContentKind, before: UndoEntry['before'], createdIds: string[] = []): string {
  const now = Date.now();
  for (const [k, v] of undos) if (v.expires < now) undos.delete(k);
  const token = newId('undo');
  undos.set(token, { userId: user.id, kind, before: structuredClone(before), createdIds, expires: now + 15 * 60_000 });
  return token;
}

export async function undo(user: SessionUser, token: string, expect: ContentKind): Promise<{ kind: ContentKind; restored: number }> {
  const entry = undos.get(token);
  // Un jeton ne sert qu'à la personne qui a fait l'action, dans la rubrique où elle l'a faite.
  if (!entry || entry.userId !== user.id || entry.kind !== expect || entry.expires < Date.now()) throw new ActionError('introuvable');
  undos.delete(token);
  const restored = await mutate(entry.kind, (list) => {
    let next = list.filter((i) => !entry.createdIds.includes(i.id));
    for (const prev of entry.before) {
      const at = next.findIndex((i) => i.id === prev.id);
      next = at >= 0 ? next.map((i) => (i.id === prev.id ? (prev as typeof i) : i)) : [...next, prev as (typeof next)[number]];
    }
    return { next, result: entry.before.length + entry.createdIds.length };
  });
  await audit(user, `${AUDIT[entry.kind]}.annulation`, undefined, `${restored} élément(s) remis comme avant`);
  return { kind: entry.kind, restored };
}

/* ------------------------------------------------------------------ */
/* Enregistrer                                                          */
/* ------------------------------------------------------------------ */

const cleanText = (s: string) =>
  frTypo(
    s
      .replace(/\r\n?/g, '\n')
      .split('\n')
      .map((l) => l.replace(/[ \t]+$/g, ''))
      .join('\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim(),
  );
const cleanLine = (s: string) => frTypo(s.replace(/\s+/g, ' ').trim());
const opt = (s: string) => (s.trim() ? s.trim() : undefined);

type Publication = { status: PublishStatus; publishAt?: string; publishedAt?: string };

function publication(mode: 'publie' | 'programme' | 'brouillon', date: string, time: string, prev: Publication | undefined, stamp: string): Publication {
  if (mode === 'programme') return { status: 'programme', publishAt: parisToInstant(date, time)!.toISOString() };
  if (mode === 'brouillon') return { status: 'brouillon' };
  // Déjà en ligne : on garde la date de mise en ligne d'origine.
  return { status: 'publie', publishedAt: prev?.status === 'publie' && prev.publishedAt ? prev.publishedAt : stamp };
}

function checkRev(prev: { updatedAt: string } | undefined, rev: string | undefined) {
  if (prev && rev && prev.updatedAt !== rev) throw new ActionError('conflit');
}

export type Saved<T> = { item: T; created: boolean; undo: string };

export async function saveNews(user: SessionUser, d: NewsDraft): Promise<Saved<NewsItem>> {
  const errs = checkNews(d, Date.now());
  if (Object.keys(errs).length) throw new FieldsError(errs);
  const club = d.club === 'reseau' ? null : d.club;
  if (!canTouchClub(user, club)) throw new ActionError('droits');
  const out = await mutate('news', (list) => {
    const prev = d.id ? list.find((n) => n.id === d.id) : undefined;
    if (d.id && !prev) throw new ActionError('introuvable');
    if (prev && !canTouchClub(user, prev.club)) throw new ActionError('droits');
    checkRev(prev, d.rev);
    const stamp = new Date().toISOString();
    const item: NewsItem = {
      id: prev?.id ?? newId(ID_PREFIX.news),
      kind: d.kind!,
      title: cleanLine(d.title),
      body: cleanText(d.body),
      photo: { kind: d.photo!.kind, file: d.photo!.file, alt: cleanLine(d.photo!.alt) },
      video: opt(d.video),
      date: d.date,
      link: d.linkUrl.trim() ? { url: d.linkUrl.trim(), label: cleanLine(d.linkLabel) } : undefined,
      club,
      audience: d.audience,
      ...publication(d.mode, d.publishDate, d.publishTime, prev, stamp),
      important: d.important,
      demo: prev?.demo,
      origin: prev?.origin ?? 'admin',
      createdAt: prev?.createdAt ?? stamp,
      createdBy: prev?.createdBy ?? user.name,
      updatedAt: stamp,
      updatedBy: user.name,
    };
    const next = prev ? list.map((n) => (n.id === item.id ? item : n)) : [item, ...list];
    return { next, result: { item, prev } };
  });
  const undoToken = remember(user, 'news', out.prev ? [out.prev] : [], out.prev ? [] : [out.item.id]);
  await audit(user, `actualite.${out.prev ? 'modification' : 'creation'}`, out.item.id, `${out.item.title} · ${out.item.status}`);
  return { item: out.item, created: !out.prev, undo: undoToken };
}

export async function saveEvent(user: SessionUser, d: EventDraft): Promise<Saved<ClubEvent>> {
  const errs = checkEvent(d, Date.now());
  if (Object.keys(errs).length) throw new FieldsError(errs);
  const club = d.club === 'aucun' ? null : d.club;
  if (!canTouchClub(user, club)) throw new ActionError('droits');
  const out = await mutate('event', (list) => {
    const prev = d.id ? list.find((e) => e.id === d.id) : undefined;
    if (d.id && !prev) throw new ActionError('introuvable');
    if (prev && !canTouchClub(user, prev.club)) throw new ActionError('droits');
    checkRev(prev, d.rev);
    const stamp = new Date().toISOString();
    const withFight = fightRequired(d) || (fightAllowed(d) && d.withFight);
    const item: ClubEvent = {
      id: prev?.id ?? newId(ID_PREFIX.event),
      kind: d.kind!,
      title: cleanLine(d.title),
      body: cleanText(d.body),
      startsAt: `${d.startDate}T${d.startTime}`,
      endsAt: d.hasEnd ? `${d.endDate}T${d.endTime}` : undefined,
      club,
      venue: opt(cleanLine(d.venue)),
      photo: { kind: d.photo!.kind, file: d.photo!.file, alt: cleanLine(d.photo!.alt) },
      ticketUrl: opt(d.ticketUrl),
      fight: withFight
        ? {
            fighter: cleanLine(d.fight.fighter),
            opponent: cleanLine(d.fight.opponent),
            weightClass: opt(cleanLine(d.fight.weightClass)),
            title: opt(cleanLine(d.fight.title)),
            broadcaster: opt(cleanLine(d.fight.broadcaster)),
          }
        : undefined,
      audience: d.audience,
      ...publication(d.mode, d.publishDate, d.publishTime, prev, stamp),
      important: d.important,
      demo: prev?.demo,
      origin: prev?.origin ?? 'admin',
      createdAt: prev?.createdAt ?? stamp,
      createdBy: prev?.createdBy ?? user.name,
      updatedAt: stamp,
      updatedBy: user.name,
    };
    const next = prev ? list.map((e) => (e.id === item.id ? item : e)) : [item, ...list];
    return { next, result: { item, prev } };
  });
  const undoToken = remember(user, 'event', out.prev ? [out.prev] : [], out.prev ? [] : [out.item.id]);
  await audit(user, `evenement.${out.prev ? 'modification' : 'creation'}`, out.item.id, `${out.item.title} · ${out.item.startsAt} · ${out.item.status}`);
  return { item: out.item, created: !out.prev, undo: undoToken };
}

export function nextNumero(list: VideoItem[]): number {
  return Math.min(999, list.reduce((n, v) => Math.max(n, v.numero), 0) + 1);
}

export async function saveVideo(user: SessionUser, d: VideoDraft): Promise<Saved<VideoItem>> {
  const out = await mutate('video', (list) => {
    const prev = d.id ? list.find((v) => v.id === d.id) : undefined;
    if (d.id && !prev) throw new ActionError('introuvable');
    checkRev(prev, d.rev);
    const errs = checkVideo(d, list.filter((v) => v.id !== d.id).map((v) => v.numero));
    if (Object.keys(errs).length) throw new FieldsError(errs);
    const stamp = new Date().toISOString();
    const item: VideoItem = {
      id: prev?.id ?? newId(ID_PREFIX.video),
      numero: d.numero,
      title: cleanLine(d.title),
      famille: d.famille!,
      niveau: d.niveau,
      dureeMin: d.dureeMin,
      objectif: d.objectif!,
      securite: d.securite!,
      gratuite: d.gratuite,
      source: d.sourceKind === 'aucune' ? { kind: 'stream', ref: '' } : { kind: d.sourceKind, ref: d.sourceRef.trim() },
      poster: { kind: d.poster!.kind, file: d.poster!.file, alt: cleanLine(d.poster!.alt) },
      status: d.mode,
      publishedAt: d.mode === 'publie' ? (prev?.status === 'publie' && prev.publishedAt ? prev.publishedAt : stamp) : undefined,
      demo: prev?.demo,
      origin: prev?.origin ?? 'admin',
      createdAt: prev?.createdAt ?? stamp,
      createdBy: prev?.createdBy ?? user.name,
      updatedAt: stamp,
      updatedBy: user.name,
    };
    const next = prev ? list.map((v) => (v.id === item.id ? item : v)) : [item, ...list];
    return { next, result: { item, prev } };
  });
  const undoToken = remember(user, 'video', out.prev ? [out.prev] : [], out.prev ? [] : [out.item.id]);
  await audit(user, `video.${out.prev ? 'modification' : 'creation'}`, out.item.id, `n° ${out.item.numero} · ${out.item.title} · ${out.item.status}`);
  return { item: out.item, created: !out.prev, undo: undoToken };
}

/* ------------------------------------------------------------------ */
/* Statut, duplication, suppression (une ou plusieurs lignes)           */
/* ------------------------------------------------------------------ */

export type StatusTarget = 'publie' | 'archive' | 'brouillon';

const hasSource = (v: VideoItem) => Boolean(v.source.ref);

export async function setStatus(user: SessionUser, kind: ContentKind, ids: string[], to: StatusTarget): Promise<{ changed: number; skipped: number; noSource: number; undo: string }> {
  const want = new Set(ids);
  const out = await mutate(kind, (list) => {
    const before: ItemOf[typeof kind][] = [];
    let skipped = 0;
    let noSource = 0;
    const stamp = new Date().toISOString();
    const next = list.map((i) => {
      if (!want.has(i.id)) return i;
      if (!editable(user, kind, i) || i.status === to) {
        skipped++;
        return i;
      }
      // Une vidéo sans fichier ne se publie pas : l'app afficherait une carte qui ne lit rien.
      if (to === 'publie' && kind === 'video' && !hasSource(i as VideoItem)) {
        noSource++;
        return i;
      }
      before.push(i);
      const changed = { ...i, status: to, updatedAt: stamp, updatedBy: user.name } as typeof i;
      if (to === 'publie') {
        (changed as Publication).publishedAt = stamp;
        delete (changed as Publication).publishAt;
      }
      if (to === 'brouillon') delete (changed as Publication).publishAt;
      return changed;
    });
    return { next, result: { before, skipped, noSource } };
  });
  const token = remember(user, kind, out.before);
  if (out.before.length) await audit(user, `${AUDIT[kind]}.statut`, out.before.map((i) => i.id).join(','), `${out.before.length} → ${to}`);
  return { changed: out.before.length, skipped: out.skipped, noSource: out.noSource, undo: token };
}

/** Gratuite (visible en mode restreint) ou réservée aux adhérents actifs (CDC §9). */
export async function setGratuite(user: SessionUser, ids: string[], gratuite: boolean): Promise<{ changed: number; undo: string }> {
  const want = new Set(ids);
  const before = await mutate('video', (list) => {
    const changed: VideoItem[] = [];
    const stamp = new Date().toISOString();
    const next = list.map((v) => {
      if (!want.has(v.id) || v.gratuite === gratuite) return v;
      changed.push(v);
      return { ...v, gratuite, updatedAt: stamp, updatedBy: user.name };
    });
    return { next, result: changed };
  });
  const token = remember(user, 'video', before);
  if (before.length) await audit(user, 'video.acces', before.map((v) => v.id).join(','), `${before.length} → ${gratuite ? 'gratuite' : 'réservée'}`);
  return { changed: before.length, undo: token };
}

export async function removeItems(user: SessionUser, kind: ContentKind, ids: string[]): Promise<{ removed: number; undo: string }> {
  const want = new Set(ids);
  const out = await mutate(kind, (list) => {
    const gone = list.filter((i) => want.has(i.id) && editable(user, kind, i));
    const goneIds = new Set(gone.map((i) => i.id));
    return { next: list.filter((i) => !goneIds.has(i.id)), result: gone };
  });
  const token = remember(user, kind, out);
  if (out.length) await audit(user, `${AUDIT[kind]}.suppression`, out.map((i) => i.id).join(','), out.map((i) => i.title).join(' · '));
  return { removed: out.length, undo: token };
}

/** Une copie en brouillon, à retoucher : le stage des vacances revient chaque année. */
export async function duplicate(user: SessionUser, kind: ContentKind, id: string): Promise<{ item: NewsItem | ClubEvent | VideoItem; undo: string }> {
  const item = await mutate(kind, (list) => {
    const src = list.find((i) => i.id === id);
    if (!src) throw new ActionError('introuvable');
    if (!editable(user, kind, src)) throw new ActionError('droits');
    const stamp = new Date().toISOString();
    const max = kind === 'video' ? 70 : 90;
    const suffix = ' (copie)';
    const title = src.title.length + suffix.length > max ? `${src.title.slice(0, max - suffix.length - 1)}…${suffix}` : `${src.title}${suffix}`;
    const copy = { ...structuredClone(src), id: newId(ID_PREFIX[kind]), title, status: 'brouillon' as const, demo: undefined, origin: 'admin' as const, createdAt: stamp, createdBy: user.name, updatedAt: stamp, updatedBy: user.name } as typeof src;
    delete (copy as Publication).publishAt;
    delete (copy as Publication).publishedAt;
    if (kind === 'video') (copy as VideoItem).numero = nextNumero(list as VideoItem[]);
    return { next: [copy, ...list], result: copy };
  });
  const token = remember(user, kind, [], [item.id]);
  await audit(user, `${AUDIT[kind]}.duplication`, id, item.id);
  return { item, undo: token };
}

/* ------------------------------------------------------------------ */
/* Lignes de liste                                                      */
/* ------------------------------------------------------------------ */

export async function rowsFor<K extends ContentKind>(user: SessionUser, kind: K): Promise<{ item: ItemOf[K]; editable: boolean }[]> {
  const list = await readKind(kind);
  return list.map((item) => ({ item, editable: editable(user, kind, item) }));
}

/** Ajoute des éléments déjà formés (reprise de l'app, exemples) sans écraser ce qui existe. */
export async function insertItems<K extends ContentKind>(user: SessionUser, kind: K, items: ItemOf[K][], action: string): Promise<{ added: number; undo: string }> {
  const added = await mutate(kind, (list) => {
    const have = new Set(list.map((i) => i.id));
    const fresh = items.filter((i) => !have.has(i.id));
    return { next: [...fresh, ...list], result: fresh };
  });
  const token = remember(user, kind, [], added.map((i) => i.id));
  if (added.length) await audit(user, `${AUDIT[kind]}.${action}`, undefined, `${added.length} élément(s)`);
  return { added: added.length, undo: token };
}

export async function purgeDemo(user: SessionUser, kind: ContentKind): Promise<{ removed: number; undo: string }> {
  const out = await mutate(kind, (list) => ({ next: list.filter((i) => !i.demo), result: list.filter((i) => i.demo) }));
  const token = remember(user, kind, out);
  if (out.length) await audit(user, `${AUDIT[kind]}.demo.retrait`, undefined, `${out.length} exemple(s)`);
  return { removed: out.length, undo: token };
}
