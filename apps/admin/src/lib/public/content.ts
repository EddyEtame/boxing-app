/**
 * Ce que l'app lit sur l'admin pour ses rubriques Actualités, Événements et
 * Vidéos (CDC §8, §9). Publié seulement, jamais une donnée de l'équipe.
 * Les formes sont définies dans @bc/contract (admin.ts) et réexportées ici.
 *
 * GET /api/actualites   → ContentList<PublicNews>
 * GET /api/evenements   → ContentList<PublicEvent>  (à venir, puis 60 jours d'historique)
 * GET /api/videos       → ContentList<PublicVideo>
 * `?demo=1` ajoute les exemples marqués « démo » (tests de l'app seulement).
 */
export const CONTENT_API = {
  news: '/api/actualites',
  events: '/api/evenements',
  videos: '/api/videos',
} as const;

export type { ContentList, PublicEvent, PublicMedia, PublicNews, PublicVideo } from '@bc/contract';
