import type { Audience, ClubEvent, ClubId, EventKind, Famille, Media, NewsItem, NewsKind, Niveau, Objectif, Securite, VideoItem } from '@/lib/types';

/**
 * Les formes propres aux rubriques Contenus (CDC §8, §9) : ce que les
 * assistants manipulent, ce que les listes affichent, ce que la photothèque
 * renvoie. Les éléments enregistrés gardent les types de `lib/types.ts`.
 */

export type ContentKind = 'news' | 'event' | 'video';

/** Où va le texte enregistré : la typographie française est posée à l'enregistrement. */
export const LIMITS = {
  newsTitle: 90,
  newsBody: 2000,
  eventTitle: 90,
  eventBody: 1500,
  videoTitle: 70,
  linkLabel: 40,
  venue: 120,
  person: 60,
  weightClass: 40,
  beltTitle: 80,
  broadcaster: 60,
  alt: 160,
  url: 500,
} as const;

/** Une photo déposée dans l'admin (collection `medias`). */
export type Upload = Media & { id: string; size: number; type: string; createdAt: string; createdBy: string };

export type Library = {
  /** Fichiers de apps/mobile/assets/photos, triés. */
  photos: string[];
  uploads: Upload[];
};

/** Ce que la publication devient à l'enregistrement. */
export type PublishMode = 'publie' | 'programme' | 'brouillon';

export type NewsDraft = {
  id?: string;
  /** `updatedAt` de la version ouverte : si quelqu'un l'a changée entre-temps, l'enregistrement est refusé plutôt qu'écrasé. */
  rev?: string;
  kind: NewsKind | null;
  title: string;
  body: string;
  /** AAAA-MM-JJ, la date affichée dans l'app. */
  date: string;
  club: ClubId | 'reseau';
  audience: Audience;
  important: boolean;
  photo: Media | null;
  video: string;
  linkUrl: string;
  linkLabel: string;
  mode: PublishMode;
  /** AAAA-MM-JJ et HH:MM, heure de Toulouse. */
  publishDate: string;
  publishTime: string;
};

export type FightDraft = { fighter: string; opponent: string; weightClass: string; title: string; broadcaster: string };

export type EventDraft = {
  id?: string;
  /** `updatedAt` de la version ouverte : si quelqu'un l'a changée entre-temps, l'enregistrement est refusé plutôt qu'écrasé. */
  rev?: string;
  kind: EventKind | null;
  title: string;
  body: string;
  startDate: string;
  startTime: string;
  hasEnd: boolean;
  endDate: string;
  endTime: string;
  club: ClubId | 'aucun';
  venue: string;
  withFight: boolean;
  fight: FightDraft;
  ticketUrl: string;
  photo: Media | null;
  audience: Audience;
  important: boolean;
  mode: PublishMode;
  publishDate: string;
  publishTime: string;
};

export type VideoSourceKind = 'stream' | 'url' | 'aucune';

export type VideoDraft = {
  id?: string;
  /** `updatedAt` de la version ouverte : si quelqu'un l'a changée entre-temps, l'enregistrement est refusé plutôt qu'écrasé. */
  rev?: string;
  famille: Exclude<Famille, 'accesLibre'> | null;
  title: string;
  numero: number;
  niveau: Niveau;
  dureeMin: number;
  objectif: Objectif | null;
  securite: Securite | null;
  sourceKind: VideoSourceKind;
  sourceRef: string;
  poster: Media | null;
  gratuite: boolean;
  mode: Exclude<PublishMode, 'programme'>;
};

/** Ligne de liste : l'élément, son statut réel à l'instant de la lecture, et si la personne peut le modifier. */
export type Row<T> = { item: T; editable: boolean };

export type NewsRow = Row<NewsItem>;
export type EventRow = Row<ClubEvent>;
export type VideoRow = Row<VideoItem>;

/** Un élément trouvé dans les fichiers de l'app, prêt à être repris. */
export type ImportCandidate = {
  id: string;
  title: string;
  sub: string;
  photo?: string;
  /** Déjà repris : on ne le reprend pas deux fois. */
  already: boolean;
  /** Ce que l'élément devient ici (« Résultat », « Brouillon, fichier à brancher »…). */
  target: string;
};

export type ImportPreview = {
  kind: ContentKind;
  path: string;
  candidates: ImportCandidate[];
  /** Le fichier n'a pas pu être lu : la raison, sans chemin disque. */
  error?: string;
  /** Ce que la reprise laisse volontairement de côté, et pourquoi (clé du dictionnaire). */
  notes: { key: string; vars?: Record<string, string | number> }[];
};

export type { NewsKind, EventKind };
