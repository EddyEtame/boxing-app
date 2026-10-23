import { publicEvents, preflight, respond } from '@/server/content-public';

/** Les événements publiés (CDC §8) : à venir d'abord, puis soixante jours d'historique. Public, lu par l'app ; forme : src/lib/public/content.ts. */
export async function GET(request: Request) {
  return respond(request, publicEvents);
}

export function OPTIONS(request: Request) {
  return preflight(request);
}
