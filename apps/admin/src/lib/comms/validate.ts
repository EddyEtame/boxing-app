import { parisToIso } from './time';
import { LIMITS, MESSAGE_STATUTS, STATUTS, isAppLink, type NotifDraft, type OutgoingDraft } from './types';
import type { MessageKey } from '@/i18n/messages';
import { isClubId } from '@/lib/clubs';
import { FAMILLES, NOTIF_MANUAL, type ClubId, type Statut } from '@/lib/types';

/**
 * Les règles des envois, écrites une fois : l'assistant les applique pendant
 * la saisie, le serveur les réapplique avant d'écrire (une action serveur est
 * une porte publique). Chaque erreur est une clé du dictionnaire.
 */
export type FieldErrors = Record<string, MessageKey>;

/** Un modèle laissé tel quel (« [date] », « [club] ») ne part jamais. */
const PLACEHOLDER = /\[[^\]\n]{0,40}\]/;
const CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

/** Texte saisi, nettoyé : caractères de contrôle retirés, espaces ramenés ; sauts de ligne gardés si `multiline`. */
export function cleanText(s: unknown, multiline: boolean): string {
  if (typeof s !== 'string') return '';
  const out = s.replace(CONTROL, '').replace(/\r\n?/g, '\n');
  return (multiline ? out.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n') : out.replace(/\s+/g, ' ')).trim();
}

export function hasPlaceholder(s: string): boolean {
  return PLACEHOLDER.test(s);
}

/** Les clubs visés sont-ils dans le périmètre du compte ? */
export function clubsInScope(clubs: ClubId[] | 'all', scope: ClubId[] | 'all'): boolean {
  if (scope === 'all') return true;
  if (clubs === 'all') return false;
  return clubs.every((c) => scope.includes(c));
}

function checkClubs(clubs: unknown, scope: ClubId[] | 'all', e: FieldErrors) {
  if (clubs !== 'all' && (!Array.isArray(clubs) || clubs.length === 0 || !clubs.every(isClubId))) e.clubs = 'comms.err.clubs';
  else if (!clubsInScope(clubs as ClubId[] | 'all', scope)) e.clubs = 'comms.err.scope';
}

/* ------------------------------------------------------------------ */
/* Notification                                                         */
/* ------------------------------------------------------------------ */

export function checkNotifType(d: Pick<NotifDraft, 'type'>): FieldErrors {
  return d.type && NOTIF_MANUAL.includes(d.type) ? {} : { type: 'comms.err.type' };
}

export function checkNotifMessage(d: Pick<NotifDraft, 'title' | 'body' | 'link'>): FieldErrors {
  const e: FieldErrors = {};
  const title = cleanText(d.title, false);
  const body = cleanText(d.body, false);
  if (!title) e.title = 'comms.err.title';
  else if (title.length > LIMITS.title) e.title = 'comms.err.titleLong';
  else if (hasPlaceholder(title)) e.title = 'comms.err.placeholder';
  if (!body) e.body = 'comms.err.body';
  else if (body.length > LIMITS.body) e.body = 'comms.err.bodyLong';
  else if (hasPlaceholder(body)) e.body = 'comms.err.placeholder';
  if (d.link !== '' && !isAppLink(d.link)) e.link = 'comms.err.link';
  return e;
}

export function checkNotifTarget(d: Pick<NotifDraft, 'clubs' | 'statuts'>, scope: ClubId[] | 'all'): FieldErrors {
  const e: FieldErrors = {};
  checkClubs(d.clubs, scope, e);
  if (!Array.isArray(d.statuts) || d.statuts.length === 0 || !d.statuts.every((s) => STATUTS.includes(s))) e.statuts = 'comms.err.statuts';
  return e;
}

/** Une programmation : au moins cinq minutes devant, au plus soixante jours. */
export function checkNotifMoment(d: Pick<NotifDraft, 'when' | 'at'>, now: number): FieldErrors {
  if (d.when === 'now') return {};
  if (d.when !== 'scheduled') return { at: 'comms.err.at' };
  const iso = parisToIso(d.at);
  if (!iso) return { at: 'comms.err.at' };
  const ts = Date.parse(iso);
  if (ts < now + 5 * 60_000) return { at: 'comms.err.atPast' };
  if (ts > now + 60 * 86_400_000) return { at: 'comms.err.atFar' };
  return {};
}

export function checkNotif(d: NotifDraft, scope: ClubId[] | 'all', now: number): FieldErrors {
  return { ...checkNotifType(d), ...checkNotifMessage(d), ...checkNotifTarget(d, scope), ...checkNotifMoment(d, now) };
}

/* ------------------------------------------------------------------ */
/* Message de l'équipe vers des adhérents                               */
/* ------------------------------------------------------------------ */

/** Le numéro d'adhérent de Deciplus : des chiffres (celui du compte de démonstration en a cinq). */
export const MEMBER_ID = /^\d{3,10}$/;

const FAMILLES_MSG = FAMILLES.filter((f) => f !== 'accesLibre');

export function checkOutgoingTo(d: Pick<OutgoingDraft, 'kind' | 'memberId' | 'memberName' | 'memberClub' | 'clubs' | 'statuts' | 'familles'>, scope: ClubId[] | 'all'): FieldErrors {
  const e: FieldErrors = {};
  if (d.kind === 'membre') {
    if (!MEMBER_ID.test(d.memberId.trim())) e.memberId = 'comms.err.memberId';
    if (!isClubId(d.memberClub)) e.memberClub = 'comms.err.memberClub';
    else if (!clubsInScope([d.memberClub], scope)) e.memberClub = 'comms.err.scope';
    if (cleanText(d.memberName, false).length > LIMITS.name) e.memberName = 'comms.err.memberName';
  } else if (d.kind === 'groupe') {
    checkClubs(d.clubs, scope, e);
    if (!Array.isArray(d.statuts) || d.statuts.length === 0 || !d.statuts.every((s: Statut) => MESSAGE_STATUTS.includes(s))) e.statuts = 'comms.err.statutsMsg';
    if (!Array.isArray(d.familles) || !d.familles.every((f) => (FAMILLES_MSG as string[]).includes(f))) e.familles = 'comms.err.familles';
  } else e.kind = 'comms.err.kind';
  return e;
}

export function checkOutgoingText(d: Pick<OutgoingDraft, 'text'>): FieldErrors {
  const text = cleanText(d.text, true);
  if (!text) return { text: 'comms.err.text' };
  if (text.length > LIMITS.message) return { text: 'comms.err.textLong' };
  if (hasPlaceholder(text)) return { text: 'comms.err.placeholder' };
  return {};
}

export function checkOutgoing(d: OutgoingDraft, scope: ClubId[] | 'all'): FieldErrors {
  return { ...checkOutgoingTo(d, scope), ...checkOutgoingText(d) };
}

/** Réponse ou note dans un fil. */
export function checkReply(text: unknown): MessageKey | null {
  const t = cleanText(text, true);
  if (!t) return 'comms.err.reply';
  if (t.length > LIMITS.reply) return 'comms.err.replyLong';
  return null;
}
