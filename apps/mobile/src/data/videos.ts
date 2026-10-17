import type { Famille } from '@/features/planning/model';
import type { PhotoSource } from '@/ui/Photo';

/**
 * Vidéothèque de démonstration : la forme finale des entrées (discipline,
 * niveau, durée, objectif, règle de sécurité, gratuite ou réservée), avec des
 * photos réelles en vignette. Les vidéos elles-mêmes viendront de l’hébergeur
 * choisi, en URL signées.
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
  coach?: string;
  photo: PhotoSource;
};

export const VIDEOS: Video[] = [
  { id: 'v12', numero: 12, titre: 'Jab, direct, esquive', famille: 'anglaise', disciplineLabel: 'Boxe anglaise', niveau: 'Débutant', dureeMin: 4, objectif: 'Technique', securite: 'seul', gratuite: true, photo: require('@/assets/photos/ring-gants.jpg') },
  { id: 'v11', numero: 11, titre: 'Mise de gants : les règles', famille: 'anglaise', disciplineLabel: 'Boxe anglaise', niveau: 'Intermédiaire', dureeMin: 6, objectif: 'Sparring', securite: 'encadrement', gratuite: false, photo: require('@/assets/photos/ring-entrainement.jpg') },
  { id: 'v10', numero: 10, titre: 'Low kick, lecture de la garde', famille: 'piedsPoings', disciplineLabel: 'Pieds-poings', niveau: 'Intermédiaire', dureeMin: 5, objectif: 'Technique', securite: 'partenaire', gratuite: false, photo: require('@/assets/photos/kick-drapeaux.jpg') },
  { id: 'v09', numero: 9, titre: 'Sac : 6 rounds de 2 min', famille: 'anglaise', disciplineLabel: 'Boxe anglaise', niveau: 'Débutant', dureeMin: 14, objectif: 'Cardio', securite: 'seul', gratuite: true, photo: require('@/assets/photos/groupe-garde.jpg') },
  { id: 'v08', numero: 8, titre: 'Passage de garde depuis la demi', famille: 'grappling', disciplineLabel: 'Grappling', niveau: 'Confirmé', dureeMin: 7, objectif: 'Technique', securite: 'partenaire', gratuite: false, photo: require('@/assets/photos/cage-kick.jpg') },
  { id: 'v07', numero: 7, titre: 'Circuit cage : 4 ateliers', famille: 'crossTraining', disciplineLabel: 'Préparation physique', niveau: 'Intermédiaire', dureeMin: 12, objectif: 'Condition', securite: 'seul', gratuite: false, photo: require('@/assets/photos/step-box-femmes.jpg') },
  { id: 'v06', numero: 6, titre: 'Mobilité hanches et épaules', famille: 'crossTraining', disciplineLabel: 'Préparation physique', niveau: 'Débutant', dureeMin: 8, objectif: 'Mobilité', securite: 'seul', gratuite: true, photo: require('@/assets/photos/groupe-fresque.jpg') },
  { id: 'v05', numero: 5, titre: 'Entrées en lutte pour le MMA', famille: 'mma', disciplineLabel: 'MMA', niveau: 'Confirmé', dureeMin: 9, objectif: 'Technique', securite: 'encadrement', gratuite: false, photo: require('@/assets/photos/kick-bresil-mexique.jpg') },
];

export const SECURITE_LABEL: Record<Securite, string> = {
  seul: 'EN AUTONOMIE',
  partenaire: 'AVEC PARTENAIRE',
  encadrement: 'ENCADREMENT REQUIS',
};
