import { existsSync } from 'node:fs';
import path from 'node:path';

/**
 * La racine du monorepo, trouvée en remontant depuis le dossier de lancement
 * (`npm run dev --workspace apps/admin` lance dans apps/admin). L'admin y lit
 * les données et les photos de l'app, sans jamais y écrire.
 */
let cached: string | null = null;

export function repoRoot(): string {
  if (cached) return cached;
  const forced = process.env.BC_REPO_ROOT?.trim();
  if (forced) return (cached = path.resolve(forced));
  let dir = process.cwd();
  for (let i = 0; i < 5; i++) {
    if (existsSync(path.join(dir, 'apps', 'mobile', 'package.json')) && existsSync(path.join(dir, 'packages'))) return (cached = dir);
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return (cached = path.resolve(process.cwd(), '..', '..'));
}

export function mobilePath(...parts: string[]): string {
  return path.join(repoRoot(), 'apps', 'mobile', ...parts);
}

/** Chemin affiché (relatif au dépôt, barres obliques) : jamais un chemin disque complet dans l'interface. */
export function displayPath(absolute: string): string {
  return path.relative(repoRoot(), absolute).split(path.sep).join('/');
}
