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
  en: { nom: string; accroche: string; pourQui: string };
  photo: PhotoSource;
};

export const DISCIPLINES: Discipline[] = [
  { famille: 'anglaise', nom: 'Boxe anglaise', accroche: 'Les poings, la garde, le déplacement. La base de tout, du premier cours à la compétition.', pourQui: 'Tous niveaux · loisirs, compétiteurs', en: { nom: 'Boxing', accroche: 'Fists, guard, footwork. The base of everything, from your first class to competition.', pourQui: 'All levels · recreational, competitors' }, photo: require('@/assets/photos/minimes-pattes-ring.jpg') },
  { famille: 'piedsPoings', nom: 'Pieds-poings · Thaï · K1', accroche: 'Poings, pieds, genoux : la boxe complète, avec un cadre et des protections.', pourQui: 'Tous niveaux · enfants, ados, adultes', en: { nom: 'Kickboxing · Muay Thai · K1', accroche: 'Fists, feet, knees: complete striking, with structure and protective gear.', pourQui: 'All levels · kids, teens, adults' }, photo: require('@/assets/photos/ramonville-kick-bresil.jpg') },
  { famille: 'mma', nom: 'MMA', accroche: 'Debout et au sol, dans une cage officielle. Technique d’abord, intensité ensuite.', pourQui: 'Adultes · ados en section encadrée', en: { nom: 'MMA', accroche: 'Standing and on the ground, in an official cage. Technique first, intensity second.', pourQui: 'Adults · teens in a supervised section' }, photo: require('@/assets/photos/ramonville-mma-cours.jpg') },
  { famille: 'grappling', nom: 'Grappling · JJB', accroche: 'Le combat au sol : contrôler, passer, soumettre. Une discipline de patience.', pourQui: 'Tous niveaux', en: { nom: 'Grappling · BJJ', accroche: 'Fighting on the ground: control, pass, submit. A discipline of patience.', pourQui: 'All levels' }, photo: require('@/assets/photos/cage-kick.jpg') },
  { famille: 'crossTraining', nom: 'Cross-training · Hyrox', accroche: 'Force, cardio, mobilité. Le moteur qui fait tenir les rounds.', pourQui: 'Tous niveaux', en: { nom: 'Cross-training · Hyrox', accroche: 'Strength, cardio, mobility. The engine that gets you through the rounds.', pourQui: 'All levels' }, photo: require('@/assets/photos/ramonville-cross-pneus.jpg') },
  { famille: 'ladyPunch', nom: 'Lady Punch · Lady Kick', accroche: 'Des cours entre femmes, sans opposition, pour frapper, respirer et rentrer plus forte.', pourQui: 'Femmes · tous niveaux', en: { nom: 'Lady Punch · Lady Kick', accroche: 'Women-only classes, no sparring: hit, breathe, and walk out stronger.', pourQui: 'Women · all levels' }, photo: require('@/assets/photos/minimes-cross-groupe.jpg') },
  { famille: 'educative', nom: 'Boxe éducative', accroche: 'Dès 7 ans : la boxe sans coups portés, pour apprendre, se tenir droit et prendre confiance.', pourQui: '7–11 ans · 12–16 ans', en: { nom: 'Youth boxing', accroche: 'From age 7: boxing without landed punches, to learn, stand tall and grow in confidence.', pourQui: '7–11 yrs · 12–16 yrs' }, photo: require('@/assets/photos/minimes-ecole-ring.jpg') },
  { famille: 'baby', nom: 'Baby boxe', accroche: 'Dès 3 ans : bouger, écouter, jouer avec des gants. Les parents regardent sourire.', pourQui: '3–6 ans', en: { nom: 'Baby boxing', accroche: 'From age 3: move, listen, play with gloves on. Parents watch them smile.', pourQui: '3–6 yrs' }, photo: require('@/assets/photos/portet-salut-ecole.jpg') },
];
