import { randomBytes } from 'node:crypto';

/**
 * Lecture des variables d'environnement, en un seul endroit. Aucune valeur
 * n'est jamais écrite dans un journal ni renvoyée au navigateur.
 */
const INSECURE = new Set(['', 'change-me', 'changeme', 'change-me-in-production', 'secret']);

const g = globalThis as typeof globalThis & { __bcaDevSecret?: string; __bcaWarned?: Set<string> };

export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

function warnOnce(key: string, message: string) {
  g.__bcaWarned ??= new Set();
  if (g.__bcaWarned.has(key)) return;
  g.__bcaWarned.add(key);
  console.warn(`[admin] ${message}`);
}

/** Le secret configuré (64 caractères hexadécimaux posés par le script), ou rien. */
export function configuredSessionSecret(): string | null {
  const value = process.env.SESSION_SECRET?.trim() ?? '';
  return value.length >= 32 && !INSECURE.has(value) ? value : null;
}

/**
 * Le secret qui signe les sessions. En développement, sans SESSION_SECRET, un
 * secret éphémère permet de travailler (les sessions meurent au redémarrage) ;
 * en production, pas de secret = pas de connexion possible.
 */
export function sessionSecret(): string | null {
  const configured = configuredSessionSecret();
  if (configured) return configured;
  if (isProduction()) return null;
  if (!g.__bcaDevSecret) {
    g.__bcaDevSecret = randomBytes(32).toString('hex');
    warnOnce('secret', 'SESSION_SECRET absent : secret éphémère pour ce démarrage. Lancez « npm run env:boutique --workspace apps/admin ».');
  }
  return g.__bcaDevSecret;
}

/** Le compte Direction : les identifiants du super administrateur de la boutique. */
export function directionCredentials(): { email: string; password: string } | null {
  const email = process.env.SUPER_ADMIN_EMAIL?.trim().toLowerCase() ?? '';
  const password = process.env.SUPER_ADMIN_PASSWORD ?? '';
  if (!email || !password) return null;
  return { email, password };
}

export type ConfigStatus = { direction: boolean; secret: boolean };

/** Ce qui manque pour se connecter, sans jamais dire les valeurs. */
export function configStatus(): ConfigStatus {
  return { direction: directionCredentials() !== null, secret: configuredSessionSecret() !== null };
}

/** Origines web supplémentaires autorisées à lire l'API publique. */
export function extraCorsOrigins(): string[] {
  return (process.env.ADMIN_CORS_ORIGINS ?? '')
    .split(',')
    .map((s) => s.trim().replace(/\/$/, ''))
    .filter(Boolean);
}
