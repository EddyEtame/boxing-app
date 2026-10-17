import type { PhotoSource } from '@/ui/Photo';
import type { ClubId } from '@/ui/theme';

/**
 * Les cinq clubs. Adresses relevées sur boxingcenter.fr le 27/09/2026 (registre
 * de vérité de la plateforme coachs). Balma a été vendue : elle n’existe plus.
 */
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
  /** Espaces distincts (États-Unis : boxe et fitness ont leurs propres plannings). */
  espaces?: string[];
};

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
    photo: require('@/assets/photos/ring-tapis-bc.jpg'),
  },
  {
    id: 'saint-cyprien',
    nom: 'Boxing Center Toulouse Saint-Cyprien',
    court: 'Saint-Cyprien',
    rue: '11 rue Sainte-Lucie',
    codePostal: '31300',
    ville: 'Toulouse',
    equipement: 'Un ring, des sacs de frappe et un espace de tatamis',
    photo: require('@/assets/photos/ring-gants.jpg'),
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
    espaces: ['Boxe', 'Fitness'],
  },
  {
    id: 'ramonville',
    nom: 'Boxing Center Ramonville',
    court: 'Ramonville',
    rue: '33 rue des Ormes',
    codePostal: '31520',
    ville: 'Ramonville-Saint-Agne',
    equipement: 'Un ring de boxe anglaise et un octogone de 7 m',
    photo: require('@/assets/photos/cage-kick.jpg'),
  },
  {
    id: 'portet',
    nom: 'Boxing Center Portet-sur-Garonne',
    court: 'Portet',
    rue: "61 route d’Espagne",
    codePostal: '31120',
    ville: 'Portet-sur-Garonne',
    equipement: 'Une salle de boxe, un ring de boxe anglaise, des tatamis et 24 sacs',
    photo: require('@/assets/photos/ring-drapeaux-vide.jpg'),
  },
];

export const clubById = (id: ClubId) => CLUBS.find((c) => c.id === id)!;
