import type { MessageKey, Translate } from '@/i18n/messages';
import { CLUB_LABEL } from '@/lib/clubs';
import { CAPABILITIES, MATRIX, type Capability } from '@/lib/permissions';
import type { ClubId, Role } from '@/lib/types';

/**
 * Les mots de l'équipe : ce que chaque profil peut faire (lu dans MATRIX,
 * jamais recopié à la main), le périmètre en clair, et les actions du journal
 * traduites — un code « planning.deplacement » ne dit rien à l'accueil.
 */

export const capLabel = (t: Translate, cap: Capability) => t(`team.cap.${cap}` as MessageKey);

/** Ce que le profil peut faire, puis ce qu'il ne peut pas : dans l'ordre du rail. */
export function rightsOf(role: Role): { can: Capability[]; cannot: Capability[] } {
  const allowed = new Set(MATRIX[role]);
  return { can: CAPABILITIES.filter((c) => allowed.has(c)), cannot: CAPABILITIES.filter((c) => !allowed.has(c)) };
}

export const roleLabel = (t: Translate, role: Role) => t(`top.role.${role}` as MessageKey);

export function scopeLabel(t: Translate, clubs: ClubId[] | 'all'): string {
  if (clubs === 'all') return t('team.scope.all');
  if (clubs.length === 0) return t('team.scope.none');
  return clubs.map((c) => CLUB_LABEL[c]).join(' · ');
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? '?';
  const second = parts.length > 1 ? parts[parts.length - 1]![0] : (parts[0]?.[1] ?? '');
  return `${first}${second}`.toUpperCase();
}

/* ------------------------------------------------------------------ */
/* Journal                                                              */
/* ------------------------------------------------------------------ */

/** Chaque action émise par l'admin, avec son libellé. Une action inconnue tombe sur sa famille. */
export const KNOWN_ACTIONS = [
  'connexion',
  'deconnexion',
  'compte.creation',
  'compte.lien',
  'compte.activation',
  'compte.modification',
  'compte.suspension',
  'compte.reprise',
  'compte.suppression',
  'planning.import',
  'planning.reprise',
  'planning.ajout',
  'planning.deplacement',
  'planning.suppression',
  'planning.annulation',
  'planning.retablissement',
  'planning.restauration',
  'planning.fermeture',
  'planning.export',
  'notification.file',
  'notification.programmation',
  'notification.annulation',
  'notification.retablissement',
  'message.envoi',
  'message.reponse',
  'message.note',
  'message.attribution',
  'message.statut.nouveau',
  'message.statut.en-cours',
  'message.statut.traite',
  'message.statut.retablissement',
  'message.demo.ajout',
  'message.demo.retrait',
  'media.depot',
  'usage.export',
  'usage.demo.retrait',
  'demo.historique',
  'moderation.validation',
  'moderation.retrait',
  'moderation.retour',
  'moderation.regles',
  'moderation.demo',
  'moderation.demo.retrait',
  'fonction.allumage',
  'fonction.coupure',
  'journal.export',
] as const;

/** Les contenus écrivent « <type>.<geste> » : le libellé se compose (« Actualité · création »). */
const CONTENT_NOUNS = ['actualite', 'evenement', 'video'] as const;
const CONTENT_VERBS = ['creation', 'modification', 'suppression', 'statut', 'duplication', 'annulation', 'reprise', 'demo', 'demo.ajout', 'demo.retrait'] as const;

export const FAMILIES = ['connexion', 'compte', 'planning', 'contenu', 'comms', 'moderation', 'fonction', 'usage', 'demo', 'journal', 'autre'] as const;
export type Family = (typeof FAMILIES)[number];

/** La famille d'une action : son premier mot, regroupé quand plusieurs rubriques parlent du même domaine. */
export function familyOf(action: string): Family {
  const head = action.split('.')[0] ?? '';
  if (head === 'connexion' || head === 'deconnexion') return 'connexion';
  if (['actualite', 'evenement', 'video', 'contenu', 'content', 'media'].includes(head)) return 'contenu';
  if (['notification', 'message', 'messages', 'messagerie', 'comms', 'envoi'].includes(head)) return 'comms';
  if ((FAMILIES as readonly string[]).includes(head)) return head as Family;
  return 'autre';
}

export function actionLabel(t: Translate, action: string): string {
  if ((KNOWN_ACTIONS as readonly string[]).includes(action)) return t(`team.do.${action}` as MessageKey);
  const [head, ...rest] = action.split('.');
  const verb = rest.join('.');
  if ((CONTENT_NOUNS as readonly string[]).includes(head ?? '') && (CONTENT_VERBS as readonly string[]).includes(verb)) {
    return `${t(`team.noun.${head}` as MessageKey)} · ${t(`team.verb.${verb}` as MessageKey)}`;
  }
  // Une action d'une autre rubrique, pas encore traduite ici : sa famille, puis son code.
  return `${t(`team.fam.${familyOf(action)}` as MessageKey)} · ${action}`;
}
