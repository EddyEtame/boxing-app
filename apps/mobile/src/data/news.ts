import type { PhotoSource } from '@/ui/Photo';
import type { ClubId } from '@/ui/theme';

/**
 * Actualités de démonstration, toutes tirées de faits réels du réseau
 * (stage enfants de la Toussaint vendu sur la boutique, Fight Event 4 du
 * 28 mars 2026, nouvelle salle de combat de Portet). Le vrai flux viendra de
 * l’admin et du site.
 */
export type NewsItem = {
  id: string;
  kind: 'evenement' | 'stage' | 'club' | 'resultat' | 'promo';
  titre: string;
  accroche: string;
  date: string;
  club?: ClubId;
  photo: PhotoSource;
  lien?: string;
  /** Visible en mode invité (vitrine). */
  publique: boolean;
};

export const NEWS: NewsItem[] = [
  {
    id: 'stage-toussaint-2026',
    kind: 'stage',
    titre: 'Stage enfants de la Toussaint',
    accroche: 'Cinq matinées de boxe éducative, du 19 au 23 octobre. Places limitées.',
    date: '2026-10-19',
    club: 'minimes',
    photo: require('@/assets/photos/minimes-groupe-elastiques.jpg'),
    lien: 'https://boutique.boxingcenter.fr/',
    publique: true,
  },
  {
    id: 'portet-salle-combat',
    kind: 'club',
    titre: 'Portet : la nouvelle salle de combat',
    accroche: '160 m², une cage MMA de 7 × 7 m sur podium, un ring neuf sur mesure.',
    date: '2026-10-10',
    club: 'portet',
    photo: require('@/assets/photos/portet-cage-podium.jpg'),
    publique: true,
  },
  {
    id: 'fight-event-4',
    kind: 'resultat',
    titre: 'Fight Event 4 : les résultats',
    accroche: 'Rani Tabal, Mael Montagne, Jefferson Vargas, Valentin Guth. Le gala en images.',
    date: '2026-03-28',
    photo: require('@/assets/photos/portet-entree-feux.jpg'),
    publique: true,
  },
  {
    id: 'rentree-259',
    kind: 'promo',
    titre: 'L’année à 259 €',
    accroche: 'Comptant ou en 4 fois sans frais, dans les cinq clubs.',
    date: '2026-09-01',
    photo: require('@/assets/photos/minimes-ring-drapeau.jpg'),
    lien: 'https://boutique.boxingcenter.fr/',
    publique: true,
  },
];

/** Les offres de la vitrine (mode invité). Faits de la boutique et des sites, octobre 2026. */
export const OFFRES = [
  { id: 'annee-259', titre: 'L’année à 259 €', accroche: 'Comptant ou en 4 fois sans frais. Les cinq clubs, tous les cours, l’accès libre.', meta: 'OFFRE · CINQ CLUBS · BOUTIQUE', photo: require('@/assets/photos/portet-ring-neuf.jpg') as PhotoSource, lien: 'https://boutique.boxingcenter.fr/' },
  { id: 'essai-10', titre: 'Ta première séance', accroche: 'Un essai à 10 €, dans le club de ton choix. Tu viens, tu testes, tu décides.', meta: 'ESSAI · 10 € · SANS ENGAGEMENT', photo: require('@/assets/photos/minimes-pattes-ring.jpg') as PhotoSource, lien: 'https://boutique.boxingcenter.fr/' },
  { id: 'sans-engagement', titre: 'Sans engagement', accroche: '44,99 € toutes les 4 semaines, 36,99 € pour les étudiants. Résiliable à tout moment.', meta: 'PRÉLÈVEMENT · 4 SEMAINES · BOUTIQUE', photo: require('@/assets/photos/ramonville-cage-ring.jpg') as PhotoSource, lien: 'https://boutique.boxingcenter.fr/' },
] as const;
