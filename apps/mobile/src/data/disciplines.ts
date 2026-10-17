import type { Famille } from '@/features/planning/model';
import type { PhotoSource } from '@/ui/Photo';

/**
 * Les disciplines du réseau (CDC §3A « disciplines et plannings »). Les clubs qui
 * les proposent se déduisent du planning réel (features/planning). Les phrases
 * suivent le ton de la charte : direct, humain, jamais intimidant.
 */
export type Discipline = {
  famille: Famille;
  nom: string;
  accroche: string;
  pourQui: string;
  photo: PhotoSource;
};

export const DISCIPLINES: Discipline[] = [
  { famille: 'anglaise', nom: 'Boxe anglaise', accroche: 'Les poings, la garde, le déplacement. La base de tout, du premier cours à la compétition.', pourQui: 'Tous niveaux · loisirs, compétiteurs', photo: require('@/assets/photos/minimes-pattes-ring.jpg') },
  { famille: 'piedsPoings', nom: 'Pieds-poings · Thaï · K1', accroche: 'Poings, pieds, genoux : la boxe complète, avec un cadre et des protections.', pourQui: 'Tous niveaux · enfants, ados, adultes', photo: require('@/assets/photos/ramonville-kick-bresil.jpg') },
  { famille: 'mma', nom: 'MMA', accroche: 'Debout et au sol, dans une cage officielle. Technique d’abord, intensité ensuite.', pourQui: 'Adultes · ados en section encadrée', photo: require('@/assets/photos/ramonville-mma-cours.jpg') },
  { famille: 'grappling', nom: 'Grappling · JJB', accroche: 'Le combat au sol : contrôler, passer, soumettre. Une discipline de patience.', pourQui: 'Tous niveaux', photo: require('@/assets/photos/cage-kick.jpg') },
  { famille: 'crossTraining', nom: 'Cross-training · Hyrox', accroche: 'Force, cardio, mobilité. Le moteur qui fait tenir les rounds.', pourQui: 'Tous niveaux', photo: require('@/assets/photos/ramonville-cross-pneus.jpg') },
  { famille: 'ladyPunch', nom: 'Lady Punch · Lady Kick', accroche: 'Des cours entre femmes, sans opposition, pour frapper, respirer et rentrer plus forte.', pourQui: 'Femmes · tous niveaux', photo: require('@/assets/photos/minimes-cross-groupe.jpg') },
  { famille: 'educative', nom: 'Boxe éducative', accroche: 'Dès 7 ans : la boxe sans coups portés, pour apprendre, se tenir droit et prendre confiance.', pourQui: '7–11 ans · 12–16 ans', photo: require('@/assets/photos/minimes-ecole-ring.jpg') },
  { famille: 'baby', nom: 'Baby boxe', accroche: 'Dès 3 ans : bouger, écouter, jouer avec des gants. Les parents regardent sourire.', pourQui: '3–6 ans', photo: require('@/assets/photos/portet-salut-ecole.jpg') },
];
