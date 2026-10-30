import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';

import { audit } from './audit';
import { read, update } from './collections';
import { newId } from './crypto';
import { mobilePath } from './paths';
import { dataPath } from './store';
import { LIMITS, type Library, type Upload } from '@/lib/content/types';
import type { SessionUser } from '@/lib/types';

import { validateImageUploadSize } from './media-limits';

export { MAX_UPLOAD_BYTES } from './media-limits';

/**
 * LA PHOTOTHÈQUE : les photos réelles des clubs (apps/mobile/assets/photos,
 * charte : jamais d'image générée) et ce que l'équipe dépose dans l'admin.
 *
 * Un dépôt est accepté s'il est vraiment une image (octets magiques, pas
 * l'extension annoncée), pèse 1,5 Mo au plus, et porte un texte alternatif.
 * Les métadonnées EXIF sont retirées des JPEG et PNG avant d'écrire : une
 * photo prise au téléphone dans une salle porte souvent ses coordonnées GPS.
 * Le fichier prend pour nom l'empreinte de son contenu : un même fichier
 * déposé deux fois n'existe qu'une fois, et se met en cache pour toujours.
 */
const NAME = /^[a-z0-9][a-z0-9._-]{0,120}\.(jpe?g|png|webp)$/i;

export async function listAppPhotos(): Promise<string[]> {
  try {
    const files = await fs.readdir(mobilePath('assets', 'photos'));
    return files.filter((f) => NAME.test(f)).sort((a, b) => a.localeCompare(b, 'fr'));
  } catch {
    return [];
  }
}

export async function readLibrary(): Promise<Library> {
  const [photos, uploads] = await Promise.all([listAppPhotos(), read('medias')]);
  return { photos, uploads: [...uploads].sort((a, b) => b.createdAt.localeCompare(a.createdAt)) };
}

export type ImageType = 'image/jpeg' | 'image/png' | 'image/webp';

/** Le vrai type d'un fichier, lu dans ses premiers octets. */
export function sniff(bytes: Uint8Array): ImageType | null {
  if (bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
  if (bytes.length > 8 && [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((b, i) => bytes[i] === b)) return 'image/png';
  if (bytes.length > 12 && String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' && String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP') return 'image/webp';
  return null;
}

/** Retire les segments APP1 (EXIF, XMP) d'un JPEG ; le reste du fichier est recopié tel quel. */
function stripJpeg(bytes: Uint8Array): Uint8Array {
  const out: Uint8Array[] = [bytes.subarray(0, 2)];
  let i = 2;
  while (i + 4 <= bytes.length) {
    if (bytes[i] !== 0xff) return bytes; // structure inattendue : on ne touche à rien
    const marker = bytes[i + 1]!;
    // Début des données d'image : tout le reste part tel quel.
    if (marker === 0xda) {
      out.push(bytes.subarray(i));
      return concat(out);
    }
    const len = (bytes[i + 2]! << 8) | bytes[i + 3]!;
    if (len < 2 || i + 2 + len > bytes.length) return bytes;
    if (marker !== 0xe1) out.push(bytes.subarray(i, i + 2 + len));
    i += 2 + len;
  }
  return bytes;
}

/** Retire les blocs eXIf et textuels d'un PNG (où se logent auteur, logiciel, coordonnées). */
function stripPng(bytes: Uint8Array): Uint8Array {
  const out: Uint8Array[] = [bytes.subarray(0, 8)];
  let i = 8;
  const drop = new Set(['eXIf', 'tEXt', 'iTXt', 'zTXt']);
  while (i + 12 <= bytes.length) {
    const len = ((bytes[i]! << 24) | (bytes[i + 1]! << 16) | (bytes[i + 2]! << 8) | bytes[i + 3]!) >>> 0;
    const type = String.fromCharCode(...bytes.subarray(i + 4, i + 8));
    const end = i + 12 + len;
    if (end > bytes.length) return bytes;
    if (!drop.has(type)) out.push(bytes.subarray(i, end));
    i = end;
    if (type === 'IEND') break;
  }
  return concat(out);
}

function concat(parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let at = 0;
  for (const p of parts) {
    out.set(p, at);
    at += p.length;
  }
  return out;
}

export type UploadError = 'trop-lourd' | 'pas-une-image' | 'alt';

export async function saveUpload(user: SessionUser, raw: Uint8Array, alt: string): Promise<{ ok: true; upload: Upload; duplicate: boolean } | { ok: false; error: UploadError }> {
  if (validateImageUploadSize(raw.length) === 'trop-lourd') return { ok: false, error: 'trop-lourd' };
  const type = sniff(raw);
  if (!type) return { ok: false, error: 'pas-une-image' };
  const text = alt.replace(/\s+/g, ' ').trim();
  if (!text || text.length > LIMITS.alt) return { ok: false, error: 'alt' };
  const clean = type === 'image/jpeg' ? stripJpeg(raw) : type === 'image/png' ? stripPng(raw) : raw;
  const ext = type === 'image/jpeg' ? 'jpg' : type === 'image/png' ? 'png' : 'webp';
  const file = `${createHash('sha256').update(clean).digest('hex').slice(0, 24)}.${ext}`;
  const target = dataPath('media', file);
  await fs.mkdir(path.dirname(target), { recursive: true });
  let exists = true;
  try {
    await fs.access(target);
  } catch {
    exists = false;
  }
  if (!exists) {
    const tmp = `${target}.${process.pid}.${Date.now().toString(36)}.tmp`;
    await fs.writeFile(tmp, clean);
    await fs.rename(tmp, target);
  }
  const result = await update('medias', (list) => {
    const known = list.find((u) => u.file === file);
    if (known) return { next: list, result: { upload: known, duplicate: true } };
    const upload: Upload = { id: newId('media'), kind: 'upload', file, alt: text, size: clean.length, type, createdAt: new Date().toISOString(), createdBy: user.name };
    return { next: [upload, ...list], result: { upload, duplicate: false } };
  });
  if (!result.duplicate) await audit(user, 'media.depot', file, `${Math.round(clean.length / 1024)} ko · ${text}`);
  return { ok: true, ...result };
}
