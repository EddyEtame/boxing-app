import type { PhotoSource } from '@/ui/Photo';
import type { ClubId } from '@/ui/theme';

/**
 * Les cinq clubs. Adresses relevées sur boxingcenter.fr le 27/09/2026 (registre
 * de vérité de la plateforme coachs). Balma a été vendue : elle n’existe plus.
 *
 * Horaires : les quatre sites de club publient « du lundi au samedi, de 10h00
 * à 21h30, fermé le dimanche » ; l’accès libre suit l’ouverture de la salle.
 * États-Unis : même règle du réseau, à confirmer sur place.
 *
 * Photos : chaque club porte ses propres photos quand un shooting existe
 * (États-Unis, Minimes, Ramonville, Portet) ; Saint-Cyprien, sans shooting,
 * est représenté par des vues du réseau.
 */
export type Ouverture = { jours: number[]; debut: number; fin: number };

export type Club = {
  id: ClubId;
  nom: string;
  court: string;
  rue: string;
  codePostal: string;
  ville: string;
  acces?: string;
  equipement: string;
  photo: PhotoSource;
  galerie: PhotoSource[];
  ouverture: Ouverture;
  /** Espaces distincts (États-Unis : boxe, MMA et fitness ont leurs propres plannings). */
  espaces?: string[];
  /** Vrai quand les photos ne viennent pas de ce club. */
  photosReseau?: boolean;
};

const SEMAINE: Ouverture = { jours: [0, 1, 2, 3, 4, 5], debut: 10 * 60, fin: 21 * 60 + 30 };

export const CLUBS: Club[] = [
  {
    id: 'minimes',
    nom: 'Boxing Center Toulouse Minimes',
    court: 'Minimes',
    rue: '12 rue de Fenouillet',
    codePostal: '31200',
    ville: 'Toulouse',
    acces: 'À 5 minutes du métro B, Barrière de Paris',
    equipement: '3 rings et des sacs de frappe',
    photo: require('@/assets/photos/minimes-ring-drapeau.jpg'),
    galerie: [require('@/assets/photos/minimes-ring-drapeau.jpg'), require('@/assets/photos/minimes-pattes-ring.jpg'), require('@/assets/photos/minimes-cross-groupe.jpg'), require('@/assets/photos/minimes-sacs.jpg')],
    ouverture: SEMAINE,
  },
  {
    id: 'saint-cyprien',
    nom: 'Boxing Center Toulouse Saint-Cyprien',
    court: 'Saint-Cyprien',
    rue: '11 rue Sainte-Lucie',
    codePostal: '31300',
    ville: 'Toulouse',
    equipement: 'Un ring, des sacs de frappe et un espace de tatamis',
    photo: require('@/assets/photos/minimes-sacs.jpg'),
    galerie: [require('@/assets/photos/minimes-sacs.jpg'), require('@/assets/photos/ring-gants.jpg')],
    ouverture: SEMAINE,
    photosReseau: true,
  },
  {
    id: 'etats-unis',
    nom: 'Boxing Center Toulouse États-Unis',
    court: 'États-Unis',
    rue: '388 avenue des États-Unis',
    codePostal: '31200',
    ville: 'Toulouse',
    equipement: '2 rings de compétition, une cage surélevée, 400 m² de tapis et 16 sacs',
    photo: require('@/assets/photos/kick-drapeaux.jpg'),
    galerie: [require('@/assets/photos/kick-drapeaux.jpg'), require('@/assets/photos/ring-tapis-bc.jpg'), require('@/assets/photos/cage-kick.jpg'), require('@/assets/photos/groupe-garde.jpg')],
    ouverture: SEMAINE,
    espaces: ['Boxe', 'MMA', 'Fitness'],
  },
  {
    id: 'ramonville',
    nom: 'Boxing Center Ramonville',
    court: 'Ramonville',
    rue: '33 rue des Ormes',
    codePostal: '31520',
    ville: 'Ramonville-Saint-Agne',
    equipement: 'Un ring de boxe anglaise et un octogone de 7 m',
    photo: require('@/assets/photos/ramonville-cage-ring.jpg'),
    galerie: [require('@/assets/photos/ramonville-cage-ring.jpg'), require('@/assets/photos/ramonville-kick-bresil.jpg'), require('@/assets/photos/ramonville-cross-pneus.jpg'), require('@/assets/photos/ramonville-mma-cours.jpg')],
    ouverture: SEMAINE,
  },
  {
    id: 'portet',
    nom: 'Boxing Center Portet-sur-Garonne',
    court: 'Portet',
    rue: "61 route d’Espagne",
    codePostal: '31120',
    ville: 'Portet-sur-Garonne',
    equipement: 'Une salle de combat de 160 m², une cage MMA de 7 × 7 m sur podium, un ring neuf, des tatamis et 24 sacs',
    photo: require('@/assets/photos/portet-ring-neuf.jpg'),
    galerie: [require('@/assets/photos/portet-ring-neuf.jpg'), require('@/assets/photos/portet-cage-podium.jpg'), require('@/assets/photos/portet-rig-rouge.jpg'), require('@/assets/photos/portet-sacs-fresque.jpg')],
    ouverture: SEMAINE,
    espaces: ['Combat', 'MMA'],
  },
];

export const clubById = (id: ClubId) => CLUBS.find((c) => c.id === id)!;

/** Le club est-il ouvert à cet instant ? */
export function estOuvert(club: Club, now = new Date()): boolean {
  const jour = (now.getDay() + 6) % 7;
  const min = now.getHours() * 60 + now.getMinutes();
  return club.ouverture.jours.includes(jour) && min >= club.ouverture.debut && min < club.ouverture.fin;
}
