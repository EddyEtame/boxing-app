import type { ClubId } from '@/ui/theme';

/**
 * Entraînements entre membres (CDC §11) : une proposition vit dans un créneau
 * d’accès libre ; aucun message, aucun fil. Données de démonstration, posées
 * sur les créneaux d’accès libre réels du planning (Saint-Cyprien, rentrée 2026).
 */
export type TrainingType = 'sparring-anglaise' | 'sparring-pieds-poings' | 'sparring-sol' | 'training-collectif' | 'footing';

export const TRAINING_TYPES: { id: TrainingType; label: string; sparring: boolean }[] = [
  { id: 'sparring-anglaise', label: 'Sparring boxe anglaise', sparring: true },
  { id: 'sparring-pieds-poings', label: 'Sparring pieds-poings', sparring: true },
  { id: 'sparring-sol', label: 'Sparring au sol / grappling', sparring: true },
  { id: 'training-collectif', label: 'Training collectif / prépa physique', sparring: false },
  { id: 'footing', label: 'Footing / course en groupe', sparring: false },
];

export type Niveau = 'Débutant' | 'Intermédiaire' | 'Confirmé';

export type Training = {
  id: string;
  type: TrainingType;
  club: ClubId;
  /** Jour (0 = lundi) et heure de début en minutes : doit tomber dans un créneau d’accès libre. */
  jour: number;
  debut: number;
  niveau: Niveau;
  observation?: string;
  organisateur: string;
  participants: number;
  jeParticipe: boolean;
};

export const TRAININGS: Training[] = [
  { id: 't1', type: 'sparring-anglaise', club: 'saint-cyprien', jour: 5, debut: 10 * 60 + 15, niveau: 'Intermédiaire', observation: 'Je pèse 80 kg, niveau intermédiaire, mise de gants technique, 6 rounds.', organisateur: 'Yanis', participants: 2, jeParticipe: false },
  { id: 't2', type: 'footing', club: 'saint-cyprien', jour: 0, debut: 10 * 60, niveau: 'Débutant', observation: '10 km départ du club, direction la Garonne par la prairie des Filtres, retour au club.', organisateur: 'Léa', participants: 4, jeParticipe: true },
  { id: 't3', type: 'training-collectif', club: 'saint-cyprien', jour: 0, debut: 14 * 60 + 30, niveau: 'Débutant', observation: 'Circuit sacs + corde, 40 min, tous niveaux.', organisateur: 'Mehdi', participants: 1, jeParticipe: false },
];
