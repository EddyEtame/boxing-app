import { extraCorsOrigins } from './env';

/**
 * Les petits outils HTTP des routes : adresse du client, contrôle d'origine
 * des requêtes qui écrivent, et CORS de l'API publique lue par l'app.
 */
type HeaderBag = { get(name: string): string | null };

/**
 * Derrière un proxy qui réécrit ces en-têtes (hébergeur, Cloudflare, nginx) : TRUST_PROXY=1. Sans lui,
 * un client pourrait les inventer à chaque requête et contourner les limites de tentatives : on les ignore,
 * et toutes les requêtes directes partagent la même limite.
 */
const trustProxy = () => process.env.TRUST_PROXY?.trim() === '1';

export function clientIp(headers: HeaderBag): string {
  if (!trustProxy()) return 'direct';
  const real = headers.get('x-real-ip')?.trim();
  if (real) return real;
  const fwd = headers.get('x-forwarded-for');
  if (fwd) {
    const first = fwd.split(',')[0]?.trim();
    if (first) return first;
  }
  return 'direct';
}

/**
 * Une requête qui écrit doit venir de l'admin lui-même. Le cookie est déjà
 * SameSite=Strict ; on vérifie en plus l'en-tête Origin (défense en profondeur
 * contre la falsification de requête intersite).
 */
export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return request.headers.get('sec-fetch-site') === 'same-origin';
  try {
    const host = (trustProxy() ? request.headers.get('x-forwarded-host') : null) ?? request.headers.get('host');
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

/**
 * Les origines web qui peuvent lire l'API publique : le serveur Expo de
 * développement (localhost:8081 et ses voisins) et les adresses du réseau
 * local, pour tester sur un téléphone. Les applications natives n'envoient pas
 * d'Origin : CORS ne les concerne pas.
 */
const LOCAL = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\]|10(?:\.\d{1,3}){3}|192\.168(?:\.\d{1,3}){2}|172\.(?:1[6-9]|2\d|3[01])(?:\.\d{1,3}){2})(?::\d{1,5})?$/;

export function allowedOrigin(origin: string | null): string | null {
  if (!origin) return null;
  const clean = origin.replace(/\/$/, '');
  if (LOCAL.test(clean)) return clean;
  return extraCorsOrigins().includes(clean) ? clean : null;
}

export function corsHeaders(request: Request, methods: string): Headers {
  const h = new Headers({ Vary: 'Origin' });
  const allowed = allowedOrigin(request.headers.get('origin'));
  if (allowed) {
    h.set('Access-Control-Allow-Origin', allowed);
    h.set('Access-Control-Allow-Methods', methods);
    h.set('Access-Control-Allow-Headers', 'content-type');
    h.set('Access-Control-Max-Age', '600');
  }
  return h;
}

export function json(data: unknown, init: { status?: number; headers?: Headers | Record<string, string> } = {}): Response {
  const headers = new Headers(init.headers);
  headers.set('content-type', 'application/json; charset=utf-8');
  headers.set('cache-control', 'no-store');
  return new Response(JSON.stringify(data), { status: init.status ?? 200, headers });
}
