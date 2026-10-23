import { clubs as BRAND_CLUBS, type ClubId } from '@bc/brand';

/**
 * Les cinq clubs, depuis @bc/brand (Balma vendue). Les espaces et les photos
 * suivent l'app (apps/mobile/src/data/clubs.ts) ; les photos sont servies par
 * /api/media/app/photos.
 */
export const CLUB_IDS = BRAND_CLUBS.map((c) => c.id) as ClubId[];

export const CLUB_LABEL: Record<ClubId, string> = Object.fromEntries(BRAND_CLUBS.map((c) => [c.id, c.nom])) as Record<ClubId, string>;

export const CLUB_CITY: Record<ClubId, string> = Object.fromEntries(BRAND_CLUBS.map((c) => [c.id, c.ville])) as Record<ClubId, string>;

/** La photo de tête de chaque club, la même que dans l'app. */
export const CLUB_PHOTO: Record<ClubId, string> = {
  minimes: 'minimes-ring-drapeau.jpg',
  'saint-cyprien': 'minimes-sacs.jpg',
  'etats-unis': 'kick-drapeaux.jpg',
  ramonville: 'ramonville-cage-ring.jpg',
  portet: 'portet-ring-neuf.jpg',
};

export function isClubId(v: unknown): v is ClubId {
  return typeof v === 'string' && (CLUB_IDS as string[]).includes(v);
}

/** « aux Minimes », « à Saint-Cyprien », « aux États-Unis »… (même règle que l'app). */
export function auClub(id: ClubId): string {
  return id === 'minimes' || id === 'etats-unis' ? `aux ${CLUB_LABEL[id]}` : `à ${CLUB_LABEL[id]}`;
}

export function photoUrl(file: string): string {
  return `/api/media/app/photos/${encodeURIComponent(file)}`;
}

/** Une vignette de la photothèque, réduite par Next (/_next/image) : quelques ko au lieu de la photo entière. */
export function photoThumb(file: string, width: 64 | 96 | 128 | 256 | 384 = 128): string {
  return `/_next/image?url=${encodeURIComponent(photoUrl(file))}&w=${width}&q=75`;
}
