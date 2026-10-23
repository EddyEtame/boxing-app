import { publicVideos, preflight, respond } from '@/server/content-public';

/** La vidéothèque publiée (CDC §9) ; l'adresse de lecture n'est donnée que pour les vidéos gratuites. Public, lu par l'app ; forme : src/lib/public/content.ts. */
export async function GET(request: Request) {
  return respond(request, publicVideos);
}

export function OPTIONS(request: Request) {
  return preflight(request);
}
