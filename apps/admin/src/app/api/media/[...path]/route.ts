import { promises as fs } from 'node:fs';
import path from 'node:path';

import { mobilePath } from '@/server/paths';
import { dataPath } from '@/server/store';

/**
 * Les images, en lecture seule :
 *  - /api/media/app/photos/<fichier>  la photothèque réelle de l'app (charte : jamais d'image générée) ;
 *  - /api/media/app/brand/<fichier>   le logo officiel, toujours un fichier ;
 *  - /api/media/uploads/<fichier>     ce qui a été déposé dans l'admin (nom = empreinte du contenu).
 * Publique : l'app affichera les mêmes adresses. Aucun autre dossier n'est atteignable.
 */
const NAME = /^[a-z0-9][a-z0-9._-]{0,120}\.(jpe?g|png|webp)$/i;
const TYPES: Record<string, string> = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' };

function resolve(parts: string[]): { file: string; immutable: boolean } | null {
  if (parts.length === 3 && parts[0] === 'app' && ['photos', 'brand', 'portraits'].includes(parts[1]!) && NAME.test(parts[2]!)) {
    const base = mobilePath('assets', parts[1]!);
    return { file: path.join(base, parts[2]!), immutable: false };
  }
  if (parts.length === 2 && parts[0] === 'uploads' && NAME.test(parts[1]!)) {
    return { file: dataPath('media', parts[1]!), immutable: true };
  }
  return null;
}

export async function GET(_request: Request, ctx: { params: Promise<{ path: string[] }> }) {
  const { path: parts } = await ctx.params;
  const target = resolve(parts);
  if (!target) return new Response('Introuvable', { status: 404 });
  try {
    const body = await fs.readFile(target.file);
    const type = TYPES[path.extname(target.file).toLowerCase()] ?? 'application/octet-stream';
    return new Response(new Uint8Array(body), {
      headers: {
        'content-type': type,
        'cache-control': target.immutable ? 'public, max-age=31536000, immutable' : 'public, max-age=86400',
        'x-content-type-options': 'nosniff',
        'access-control-allow-origin': '*',
      },
    });
  } catch {
    return new Response('Introuvable', { status: 404 });
  }
}
