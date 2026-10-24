import type { Famille } from '@/features/planning/model';
import type { PhotoSource } from '@/ui/Photo';

/**
 * Vidéothèque de démonstration : la forme finale des entrées (discipline,
 * niveau, durée, objectif, règle de sécurité, gratuite ou réservée), avec des
 * photos réelles des clubs en vignette. Les vidéos elles-mêmes viendront de
 * l’hébergeur choisi, en URL signées. Aucune vidéo ne nomme de coach (Eddy, 24/10/2026).
 */
export type Securite = 'seul' | 'partenaire' | 'encadrement';

export type Video = {
  id: string;
  numero: number;
  titre: string;
  famille: Famille;
  disciplineLabel: string;
  niveau: 'Débutant' | 'Intermédiaire' | 'Confirmé';
  dureeMin: number;
  objectif: string;
  securite: Securite;
  gratuite: boolean;
  /** Le titre, la discipline et l’objectif en anglais ; le niveau passe par les clés de traduction. */
  en: { titre: string; disciplineLabel: string; objectif: string };
  photo: PhotoSource;
};

export const VIDEOS: Video[] = [
  { id: 'v12', numero: 12, titre: 'Jab, direct, esquive', famille: 'anglaise', disciplineLabel: 'Boxe anglaise', niveau: 'Débutant', dureeMin: 4, objectif: 'Technique', securite: 'seul', gratuite: true, en: { titre: 'Jab, cross, slip', disciplineLabel: 'Boxing', objectif: 'Technique' }, photo: require('@/assets/photos/minimes-pattes-ring.jpg') },
  { id: 'v11', numero: 11, titre: 'Mise de gants : les règles', famille: 'anglaise', disciplineLabel: 'Boxe anglaise', niveau: 'Intermédiaire', dureeMin: 6, objectif: 'Sparring', securite: 'encadrement', gratuite: false, en: { titre: 'Sparring: the rules', disciplineLabel: 'Boxing', objectif: 'Sparring' }, photo: require('@/assets/photos/minimes-sparring-banniere.jpg') },
  { id: 'v10', numero: 10, titre: 'Low kick, lecture de la garde', famille: 'piedsPoings', disciplineLabel: 'Pieds-poings', niveau: 'Intermédiaire', dureeMin: 5, objectif: 'Technique', securite: 'partenaire', gratuite: false, en: { titre: 'Low kick, reading the guard', disciplineLabel: 'Kickboxing', objectif: 'Technique' }, photo: require('@/assets/photos/ramonville-kick-bresil.jpg') },
  { id: 'v09', numero: 9, titre: 'Sac : 6 rounds de 2 min', famille: 'anglaise', disciplineLabel: 'Boxe anglaise', niveau: 'Débutant', dureeMin: 14, objectif: 'Cardio', securite: 'seul', gratuite: true, en: { titre: 'Heavy bag: 6 × 2-minute rounds', disciplineLabel: 'Boxing', objectif: 'Cardio' }, photo: require('@/assets/photos/minimes-sacs.jpg') },
  { id: 'v08', numero: 8, titre: 'Passage de garde depuis la demi', famille: 'grappling', disciplineLabel: 'Grappling', niveau: 'Confirmé', dureeMin: 7, objectif: 'Technique', securite: 'partenaire', gratuite: false, en: { titre: 'Passing the guard from half guard', disciplineLabel: 'Grappling', objectif: 'Technique' }, photo: require('@/assets/photos/cage-kick.jpg') },
  { id: 'v07', numero: 7, titre: 'Circuit cage : 4 ateliers', famille: 'crossTraining', disciplineLabel: 'Préparation physique', niveau: 'Intermédiaire', dureeMin: 12, objectif: 'Condition', securite: 'seul', gratuite: false, en: { titre: 'Cage circuit: 4 stations', disciplineLabel: 'Strength & conditioning', objectif: 'Conditioning' }, photo: require('@/assets/photos/ramonville-cross-pneus.jpg') },
  { id: 'v06', numero: 6, titre: 'Mobilité hanches et épaules', famille: 'crossTraining', disciplineLabel: 'Préparation physique', niveau: 'Débutant', dureeMin: 8, objectif: 'Mobilité', securite: 'seul', gratuite: true, en: { titre: 'Hip and shoulder mobility', disciplineLabel: 'Strength & conditioning', objectif: 'Mobility' }, photo: require('@/assets/photos/minimes-cross-groupe.jpg') },
  { id: 'v05', numero: 5, titre: 'Entrées en lutte pour le MMA', famille: 'mma', disciplineLabel: 'MMA', niveau: 'Confirmé', dureeMin: 9, objectif: 'Technique', securite: 'encadrement', gratuite: false, en: { titre: 'Wrestling entries for MMA', disciplineLabel: 'MMA', objectif: 'Technique' }, photo: require('@/assets/photos/ramonville-mma-cours.jpg') },
];
