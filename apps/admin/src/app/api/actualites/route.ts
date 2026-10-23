import { publicNews, preflight, respond } from '@/server/content-public';

/** Les actualités publiées (CDC §8), pour la rubrique de l'app. Public, lu par l'app ; forme : src/lib/public/content.ts. */
export async function GET(request: Request) {
  return respond(request, publicNews);
}

export function OPTIONS(request: Request) {
  return preflight(request);
}
