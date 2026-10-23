import type { TrainingProposal, TrainingType } from '@/lib/types';

/**
 * Les vérifications automatiques d'une proposition d'entraînement entre
 * membres (CDC §11). Calculées sur le serveur à chaque lecture — jamais
 * stockées : une règle qui change (âge minimal, catégorie coupée, créneau
 * d'accès libre déplacé) s'applique tout de suite à toute la file.
 *
 * `bloquant` : la proposition ne peut pas être mise en ligne telle quelle.
 * `attention` : à relire, l'équipe tranche.
 */
export const CHECK_CODES = ['coordonnees', 'hors-acces-libre', 'sparring-mineur', 'age-minimum', 'age-inconnu', 'categorie-coupee', 'passee', 'mots-sensibles'] as const;
export type CheckCode = (typeof CHECK_CODES)[number];

export type ModerationCheck = {
  code: CheckCode;
  level: 'bloquant' | 'attention';
  /** Les morceaux de l'observation en cause, surlignés dans la carte. */
  hits?: string[];
  /** Les valeurs du message (âge, créneaux du jour…). */
  vars?: Record<string, string | number>;
};

export type QueueItem = TrainingProposal & { checks: ModerationCheck[]; blocking: boolean };

export const blocking = (checks: ModerationCheck[]) => checks.some((c) => c.level === 'bloquant');

/** L'icône et la couleur de chaque type, dans l'ordre du CDC §11 A.4. */
export const TYPE_ORDER: TrainingType[] = ['sparring-anglaise', 'sparring-pieds-poings', 'sparring-sol', 'training-collectif', 'footing'];

/** Les bornes que l'équipe peut régler (en dessous de 14 ans, le regroupement n'a pas de sens sans encadrement). */
export const AGE_BOUNDS = { sparring: { min: 16, max: 30 }, other: { min: 14, max: 21 } } as const;
