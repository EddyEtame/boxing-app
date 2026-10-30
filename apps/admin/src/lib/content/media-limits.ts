/**
 * Limites médias partagées (client + serveur) pour couvertures et vignettes app.
 */

export const MAX_IMAGE_UPLOAD_BYTES = Math.floor(1.5 * 1024 * 1024);

export const MAX_UPLOAD_BYTES = MAX_IMAGE_UPLOAD_BYTES;

export type ImageSizeVerdict = 'ok' | 'trop-lourd';

export function validateImageUploadSize(byteLength: number): ImageSizeVerdict {
  return byteLength > MAX_IMAGE_UPLOAD_BYTES ? 'trop-lourd' : 'ok';
}

const VIDEO_URL_MAX = 600;

/** URL vidéo externe https uniquement ; pas de dépôt ni réencodage côté admin. */
export function validateExternalVideoUrl(raw: string): boolean {
  const url = raw.trim();
  if (!url || url.length > VIDEO_URL_MAX) return false;
  if (/^(data:|blob:|file:)/i.test(url)) return false;
  try {
    const u = new URL(url);
    if (u.protocol !== 'https:') return false;
    if (!u.hostname) return false;
    return true;
  } catch {
    return false;
  }
}
