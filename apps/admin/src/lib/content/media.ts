import { photoUrl } from '@/lib/clubs';
import type { Media } from '@/lib/types';

/** L'adresse d'une image, servie par /api/media (photothèque de l'app ou dépôt de l'admin). */
export function mediaUrl(m: Pick<Media, 'kind' | 'file'>): string {
  return m.kind === 'upload' ? `/api/media/uploads/${encodeURIComponent(m.file)}` : photoUrl(m.file);
}

/**
 * Une vignette à la bonne taille, par l'optimiseur d'images de Next (sharp) :
 * la photothèque pèse 12 Mo en pleine taille, ses vignettes 256 px en pèsent
 * moins d'un demi. Largeurs permises : celles de `images.imageSizes` / `deviceSizes`.
 */
export function thumbUrl(m: Pick<Media, 'kind' | 'file'>, width: 128 | 256 | 640 | 1080 = 256): string {
  return `/_next/image?url=${encodeURIComponent(mediaUrl(m))}&w=${width}&q=75`;
}

/** Les rayons de la photothèque, d'après le début du nom de fichier (« portet-ring-neuf.jpg »). */
export const PHOTO_GROUPS = ['minimes', 'portet', 'ramonville', 'gala', 'ring', 'autres'] as const;
export type PhotoGroup = (typeof PHOTO_GROUPS)[number];

export function groupOf(file: string): PhotoGroup {
  const head = file.split('-')[0] ?? '';
  return (PHOTO_GROUPS as readonly string[]).includes(head) ? (head as PhotoGroup) : 'autres';
}

/** « minimes-ring-drapeau.jpg » → « minimes ring drapeau » (nom lisible, jamais un texte alternatif). */
export function readableName(file: string): string {
  return file.replace(/\.(jpe?g|png|webp)$/i, '').replace(/[-_]+/g, ' ');
}

export function humanSize(bytes: number, locale: 'fr' | 'en'): string {
  const mo = bytes / (1024 * 1024);
  if (mo >= 1) return `${mo.toLocaleString(locale === 'fr' ? 'fr-FR' : 'en-GB', { maximumFractionDigits: 1 })} ${locale === 'fr' ? 'Mo' : 'MB'}`;
  return `${Math.max(1, Math.round(bytes / 1024))} ${locale === 'fr' ? 'ko' : 'KB'}`;
}
