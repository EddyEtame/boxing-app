import { audit } from './audit';
import { DIRECTION_ID, listAccounts } from './accounts';
import { read, update } from './collections';
import { digestEqual, newId, randomToken, sha256 } from './crypto';
import { ActionError } from './session';
import type { Assignee, StoredThread, ThreadView } from '@/lib/comms/types';
import { checkReply, cleanText } from '@/lib/comms/validate';
import { can, inScope } from '@/lib/permissions';
import type { ThreadResponse } from '@/lib/public/comms';
import type { ClubId, InboxMessage, InboxThread, SessionUser, Statut, Sujet } from '@/lib/types';

/**
 * LA BOÎTE DE RÉCEPTION DE LA DIRECTION (CDC §10 : « Les messages devront
 * arriver dans une interface accessible aux personnes autorisées par la
 * direction »).
 *
 * Un fil vient de l'app (POST /api/messages) ou des exemples. Chacun ne se lit
 * que dans le périmètre de la personne (ses clubs). L'adhérent lit les réponses
 * signées, jamais les notes internes ni le nom du compte qui a répondu.
 */

const MAX_THREADS = 3000;
const MAX_MESSAGES = 200;

const toView = (t: StoredThread): ThreadView => {
  const { app, ...rest } = t;
  return { ...rest, declared: Boolean(app) };
};

async function threads(): Promise<StoredThread[]> {
  return (await read('messagerie')) as StoredThread[];
}

export async function readThreads(user: SessionUser): Promise<ThreadView[]> {
  return (await threads())
    .filter((t) => inScope(user, t.member.club))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .map(toView);
}

/** À qui confier un fil : la direction, et les comptes actifs qui lisent la boîte dans le club du fil. */
export async function assignees(): Promise<(Assignee & { clubs: ClubId[] | 'all' })[]> {
  const team = (await listAccounts()).filter((a) => a.status === 'actif' && can(a, 'messagerie'));
  return [{ id: DIRECTION_ID, name: 'Direction', clubs: 'all' as const }, ...team.map((a) => ({ id: a.id, name: a.name, clubs: a.clubs }))];
}

/** Modifie des fils du périmètre ; un fil hors périmètre est ignoré comme s'il n'existait pas. */
async function mutate<R>(user: SessionUser, ids: string[], fn: (t: StoredThread) => StoredThread | null, result: (changed: StoredThread[]) => R): Promise<R> {
  const wanted = new Set(ids.slice(0, 500));
  return update('messagerie', (list) => {
    const changed: StoredThread[] = [];
    const next = (list as StoredThread[]).map((t) => {
      if (!wanted.has(t.id) || !inScope(user, t.member.club)) return t;
      const out = fn(t);
      if (!out) return t;
      changed.push(out);
      return out;
    });
    return { next, result: result(changed) };
  });
}

export async function replyThread(user: SessionUser, id: string, text: string): Promise<InboxMessage> {
  const err = checkReply(text);
  if (err) throw new ActionError('invalide', err);
  const msg: InboxMessage = { id: newId('msg'), from: 'staff', authorId: user.id, signature: user.signature, text: cleanText(text, true), at: new Date().toISOString() };
  const done = await mutate(
    user,
    [id],
    (t) => ({ ...t, messages: [...t.messages, msg].slice(-MAX_MESSAGES), status: t.status === 'nouveau' ? 'en-cours' : t.status, unread: false, updatedAt: msg.at }),
    (c) => c.length,
  );
  if (!done) throw new ActionError('introuvable');
  await audit(user, 'message.reponse', id);
  return msg;
}

export async function noteThread(user: SessionUser, id: string, text: string): Promise<InboxMessage> {
  const err = checkReply(text);
  if (err) throw new ActionError('invalide', err);
  const msg: InboxMessage = { id: newId('msg'), from: 'note', authorId: user.id, signature: user.name, text: cleanText(text, true), at: new Date().toISOString() };
  const done = await mutate(user, [id], (t) => ({ ...t, messages: [...t.messages, msg].slice(-MAX_MESSAGES), updatedAt: msg.at }), (c) => c.length);
  if (!done) throw new ActionError('introuvable');
  await audit(user, 'message.note', id);
  return msg;
}

export async function setThreadStatus(user: SessionUser, ids: string[], status: InboxThread['status']): Promise<{ ids: string[]; before: Record<string, InboxThread['status']> }> {
  if (!['nouveau', 'en-cours', 'traite'].includes(status)) throw new ActionError('invalide');
  const before: Record<string, InboxThread['status']> = {};
  const res = await mutate(
    user,
    ids,
    (t) => {
      if (t.status === status) return null;
      before[t.id] = t.status;
      return { ...t, status, unread: status === 'traite' ? false : t.unread, updatedAt: new Date().toISOString() };
    },
    (c) => c.map((t) => t.id),
  );
  if (res.length) await audit(user, `message.statut.${status}`, res.length === 1 ? res[0] : `${res.length} fils`);
  return { ids: res, before };
}

/** Rétablit des statuts d'avant (pour « Annuler l'action »). */
export async function restoreThreadStatus(user: SessionUser, before: Record<string, InboxThread['status']>): Promise<number> {
  const ids = Object.keys(before).slice(0, 500);
  const n = await mutate(
    user,
    ids,
    (t) => {
      const b = before[t.id];
      return b && ['nouveau', 'en-cours', 'traite'].includes(b) ? { ...t, status: b } : null;
    },
    (c) => c.length,
  );
  if (n) await audit(user, 'message.statut.retablissement', `${n} fil(s)`);
  return n;
}

export async function setThreadUnread(user: SessionUser, ids: string[], unread: boolean): Promise<number> {
  return mutate(user, ids, (t) => (t.unread === unread ? null : { ...t, unread }), (c) => c.length);
}

export async function assignThread(user: SessionUser, id: string, assigneeId: string | null): Promise<void> {
  if (assigneeId !== null) {
    const list = await assignees();
    const who = list.find((a) => a.id === assigneeId);
    const thread = (await threads()).find((t) => t.id === id);
    if (!who || !thread || (who.clubs !== 'all' && !who.clubs.includes(thread.member.club))) throw new ActionError('invalide');
  }
  const done = await mutate(user, [id], (t) => (t.assignee === (assigneeId ?? undefined) ? null : { ...t, assignee: assigneeId ?? undefined }), (c) => c.length);
  if (!done) return;
  await audit(user, 'message.attribution', id, assigneeId ?? 'personne');
}

/* ------------------------------------------------------------------ */
/* Exemples (jamais chargés seuls)                                      */
/* ------------------------------------------------------------------ */

type Seed = { club: ClubId; sujet: Sujet; name: string; memberId: string; status: InboxThread['status']; unread: boolean; assignee?: string; ago: number; messages: { from: InboxMessage['from']; text: string; signature?: string; after: number }[] };

/** Des demandes ordinaires, sans aucun fait inventé sur un club (ni tarif, ni règle, ni horaire). */
const SEEDS: Seed[] = [
  { club: 'minimes', sujet: 'acces', name: 'Camille R.', memberId: '51027', status: 'nouveau', unread: true, ago: 0.08, messages: [{ from: 'member', text: 'Bonjour, mon badge ne passe plus au tourniquet depuis ce matin. L’accueil m’a fait entrer, mais je préfère vous prévenir.', after: 0 }] },
  { club: 'saint-cyprien', sujet: 'abonnement', name: 'Lucas M.', memberId: '50388', status: 'nouveau', unread: true, ago: 0.4, messages: [{ from: 'member', text: 'Bonjour, est-il possible de suspendre mon abonnement pendant un mois ? Je me suis fait une entorse au poignet. Faut-il un certificat médical ?', after: 0 }] },
  {
    club: 'etats-unis',
    sujet: 'info',
    name: 'Inès B.',
    memberId: '49712',
    status: 'en-cours',
    unread: false,
    assignee: 'direction',
    ago: 1.2,
    messages: [
      { from: 'member', text: 'Le cours de Hyrox du lundi midi est-il ouvert aux débutants ?', after: 0 },
      { from: 'note', text: 'Demander au coach du lundi midi avant de répondre.', signature: 'Direction', after: 0.1 },
      { from: 'staff', text: 'Bonjour Inès, je pose la question au coach du cours et je vous réponds ici dès que j’ai sa réponse.', signature: 'Accueil · États-Unis', after: 0.2 },
    ],
  },
  {
    club: 'ramonville',
    sujet: 'admin',
    name: 'Hugo D.',
    memberId: '50911',
    status: 'traite',
    unread: false,
    ago: 3.5,
    messages: [
      { from: 'member', text: 'Bonjour, pourriez-vous me faire une attestation d’inscription pour mon comité d’entreprise ?', after: 0 },
      { from: 'staff', text: 'Bonjour Hugo, c’est noté : nous la préparons et vous prévenons ici dès qu’elle est prête.', signature: 'Accueil · Ramonville', after: 0.3 },
      { from: 'member', text: 'Merci beaucoup !', after: 0.4 },
    ],
  },
  { club: 'portet', sujet: 'general', name: 'Nora K.', memberId: '51204', status: 'nouveau', unread: true, ago: 0.9, messages: [{ from: 'member', text: 'Bonjour, est-ce que je peux venir avec une amie pour lui faire découvrir le club ?', after: 0 }] },
  {
    club: 'minimes',
    sujet: 'abonnement',
    name: 'Yanis T.',
    memberId: '48977',
    status: 'en-cours',
    unread: true,
    assignee: 'direction',
    ago: 2.1,
    messages: [
      { from: 'member', text: 'J’ai l’impression d’avoir été prélevé deux fois ce mois-ci. Pouvez-vous vérifier ?', after: 0 },
      { from: 'staff', text: 'Bonjour Yanis, merci de nous l’avoir signalé : nous vérifions et revenons vers vous ici.', signature: 'Direction · Boxing Center', after: 0.2 },
      { from: 'note', text: 'À vérifier dans Deciplus (prélèvements du mois).', signature: 'Direction', after: 0.25 },
      { from: 'member', text: 'D’accord, merci. Je peux vous envoyer une capture de mon relevé si besoin.', after: 1.1 },
    ],
  },
  { club: 'saint-cyprien', sujet: 'info', name: 'Léa P.', memberId: '50133', status: 'nouveau', unread: false, ago: 5.2, messages: [{ from: 'member', text: 'Bonjour, jusqu’à quelle heure la salle est-elle ouverte le samedi ?', after: 0 }] },
  {
    club: 'etats-unis',
    sujet: 'acces',
    name: 'Sarah L.',
    memberId: '49620',
    status: 'traite',
    unread: false,
    ago: 6,
    messages: [
      { from: 'member', text: 'On m’a volé mon sac avec mon badge dedans. Comment faire pour le bloquer ?', after: 0 },
      { from: 'staff', text: 'Bonjour Sarah, merci de nous prévenir : nous le désactivons et vous indiquons ici la marche à suivre pour en récupérer un nouveau.', signature: 'Accueil · États-Unis', after: 0.1 },
    ],
  },
];

export async function loadDemoThreads(user: SessionUser): Promise<number> {
  const now = Date.now();
  const day = 86_400_000;
  const n = await update('messagerie', (list) => {
    if ((list as StoredThread[]).some((t) => t.demo)) return { next: list, result: 0 };
    const made: StoredThread[] = SEEDS.filter((s) => inScope(user, s.club)).map((s) => {
      const start = now - s.ago * day;
      const messages: InboxMessage[] = s.messages.map((m) => ({ id: newId('msg'), from: m.from, signature: m.signature, text: m.text, at: new Date(Math.min(now - 60_000, start + m.after * day)).toISOString() }));
      const statut: Statut = 'actif';
      return {
        id: newId('fil'),
        member: { id: s.memberId, name: s.name, club: s.club, statut },
        sujet: s.sujet,
        status: s.status,
        assignee: s.assignee,
        messages,
        unread: s.unread,
        createdAt: messages[0]!.at,
        updatedAt: messages[messages.length - 1]!.at,
        demo: true,
      };
    });
    return { next: [...made, ...list].slice(0, MAX_THREADS), result: made.length };
  });
  if (n) await audit(user, 'message.demo.ajout', `${n} fils`);
  return n;
}

export async function purgeDemoThreads(user: SessionUser): Promise<number> {
  const n = await update('messagerie', (list) => {
    const keep = list.filter((t) => !t.demo || !inScope(user, t.member.club));
    return { next: keep, result: list.length - keep.length };
  });
  if (n) await audit(user, 'message.demo.retrait', `${n} fils`);
  return n;
}

/* ------------------------------------------------------------------ */
/* Ce que l'app envoie et relit                                         */
/* ------------------------------------------------------------------ */

export type AppMessageInput = { anonId: string; club: ClubId; statut: Statut; sujet: Sujet; text: string; name?: string; memberId?: string };

const anonHash = (anonId: string) => sha256(`bc-anon|${anonId}`).slice(0, 32);
const tokenHash = (token: string) => sha256(`bc-thread|${token}`);

/** Ouvre un fil. Le jeton n'existe qu'ici et dans l'app : seule son empreinte est gardée. */
export async function openThreadFromApp(input: AppMessageInput): Promise<{ thread: StoredThread; token: string }> {
  const token = randomToken(24);
  const at = new Date().toISOString();
  const ah = anonHash(input.anonId);
  const thread: StoredThread = {
    id: newId('fil'),
    member: { id: input.memberId ?? `app-${ah.slice(0, 8)}`, name: input.name ?? '', club: input.club, statut: input.statut },
    sujet: input.sujet,
    status: 'nouveau',
    messages: [{ id: newId('msg'), from: 'member', text: input.text, at }],
    unread: true,
    createdAt: at,
    updatedAt: at,
    app: { anonHash: ah, tokenHash: tokenHash(token), identity: 'declaree' },
  };
  await update('messagerie', (list) => ({ next: [thread, ...(list as StoredThread[])].slice(0, MAX_THREADS), result: undefined }));
  return { thread, token };
}

function tokenMatches(t: StoredThread, token: string): boolean {
  return Boolean(t.app) && digestEqual(tokenHash(token), t.app!.tokenHash);
}

/** Ajoute un message à un fil, si le jeton est le bon. Un fil traité se rouvre. */
export async function appendFromApp(threadId: string, token: string, input: AppMessageInput): Promise<StoredThread | null> {
  return update('messagerie', (list) => {
    const all = list as StoredThread[];
    const i = all.findIndex((t) => t.id === threadId);
    const t = all[i];
    if (!t || !tokenMatches(t, token) || t.app!.anonHash !== anonHash(input.anonId)) return { next: list, result: null };
    const at = new Date().toISOString();
    const nextThread: StoredThread = {
      ...t,
      messages: [...t.messages, { id: newId('msg'), from: 'member' as const, text: input.text, at }].slice(-MAX_MESSAGES),
      status: t.status === 'traite' ? 'nouveau' : t.status,
      unread: true,
      updatedAt: at,
    };
    const next = [...all];
    next[i] = nextThread;
    return { next, result: nextThread };
  });
}

/** Le fil tel que l'adhérent le lit : sans note interne, sans nom de compte. */
export async function readForApp(threadId: string, token: string): Promise<ThreadResponse | null> {
  const t = (await threads()).find((x) => x.id === threadId);
  if (!t || !tokenMatches(t, token)) return null;
  return {
    id: t.id,
    status: t.status,
    sujet: t.sujet,
    updatedAt: t.updatedAt,
    messages: t.messages.filter((m) => m.from !== 'note').map((m) => ({ id: m.id, from: m.from as 'member' | 'staff' | 'auto', signature: m.from === 'staff' ? m.signature : undefined, text: m.text, at: m.at })),
  };
}

