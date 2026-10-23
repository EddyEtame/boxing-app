import { NextResponse, type NextRequest } from 'next/server';

import { configuredSessionSecret } from './server/env';
import { decodeSession, SESSION_COOKIE } from './server/token';

/**
 * La porte d'entrée de chaque page (Next 16 : `proxy` remplace `middleware`).
 *
 * 1. Une politique de contenu (CSP) avec un nonce neuf par requête : seuls les
 *    scripts de l'admin s'exécutent.
 * 2. Une page sans session renvoie à la connexion (avec le chemin demandé).
 *    Ce n'est qu'un premier filtre : chaque page, action et route revérifie la
 *    session et relit le compte (src/server/session.ts).
 *
 * L'API n'est pas filtrée ici : ses routes publiques (lues par l'app) et
 * privées (l'admin) font leurs propres contrôles.
 */
const PUBLIC_PAGES = ['/connexion', '/activation'];

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const isPublic = PUBLIC_PAGES.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  if (!isPublic) {
    const token = request.cookies.get(SESSION_COOKIE)?.value;
    const secret = configuredSessionSecret();
    // Avec un secret configuré, on vérifie déjà la signature ; sans, on laisse la page trancher.
    const looksValid = token ? (secret ? decodeSession(token, secret) !== null : true) : false;
    if (!looksValid) {
      const url = request.nextUrl.clone();
      url.pathname = '/connexion';
      url.search = pathname === '/' ? '' : `?suite=${encodeURIComponent(pathname + search)}`;
      return NextResponse.redirect(url);
    }
  }

  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  const dev = process.env.NODE_ENV !== 'production';
  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${dev ? " 'unsafe-eval'" : ''}`,
    // Les styles posés par React (positions, hauteurs de barres) sont des attributs : 'unsafe-inline' pour le style seulement.
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    `connect-src 'self'${dev ? ' ws: wss:' : ''}`,
    "media-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(dev ? [] : ['upgrade-insecure-requests']),
  ].join('; ');

  const headers = new Headers(request.headers);
  headers.set('x-nonce', nonce);
  headers.set('content-security-policy', csp);
  const response = NextResponse.next({ request: { headers } });
  response.headers.set('content-security-policy', csp);
  return response;
}

export const config = {
  matcher: [
    {
      source: '/((?!api|_next/static|_next/image|favicon.ico|icon|apple-icon).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
};
