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
};

export const NEWS: NewsItem[] = [
  {
    id: 'stage-toussaint-2026',
    kind: 'stage',
    titre: 'Stage enfants de la Toussaint',
    accroche: 'Cinq matinées de boxe éducative, du 19 au 23 octobre. Places limitées.',
    date: '2026-10-19',
    club: 'minimes',
    photo: require('@/assets/photos/step-box-femmes.jpg'),
    lien: 'https://boutique.boxingcenter.fr/',
  },
  {
    id: 'portet-salle-combat',
    kind: 'club',
    titre: 'Portet : la nouvelle salle de combat',
    accroche: '160 m², une cage MMA de 7 × 7 m sur podium, un ring neuf sur mesure.',
    date: '2026-10-10',
    club: 'portet',
    photo: require('@/assets/photos/cage-kick.jpg'),
  },
  {
    id: 'fight-event-4',
    kind: 'resultat',
    titre: 'Fight Event 4 : les résultats',
    accroche: 'Rani Tabal, Mael Montagne, Jefferson Vargas, Valentin Guth. Le gala en images.',
    date: '2026-03-28',
    photo: require('@/assets/photos/gala-victoire.jpg'),
  },
  {
    id: 'rentree-259',
    kind: 'promo',
    titre: "L’année à 259 €",
    accroche: 'Comptant ou en 4 fois sans frais, dans les cinq clubs.',
    date: '2026-09-01',
    photo: require('@/assets/photos/groupe-garde.jpg'),
    lien: 'https://boutique.boxingcenter.fr/',
  },
];
