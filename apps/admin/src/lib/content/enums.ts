import { EVENT_KINDS, FAMILLES, NEWS_KINDS, NIVEAUX, OBJECTIFS, SECURITES, type Audience, type EventKind, type Famille, type NewsKind, type Niveau, type Objectif, type Securite } from '@/lib/types';

/** Les gardes de type des listes fermées : une valeur venue du navigateur n'est crue qu'après eux. */
export const AUDIENCES_OK: readonly Audience[] = ['tous', 'actifs'];

/** Les familles d'une vidéo : toutes, sauf l'accès libre (ce n'est pas une discipline). */
export const VIDEO_FAMILLES = FAMILLES.filter((f): f is Exclude<Famille, 'accesLibre'> => f !== 'accesLibre');

export const isNewsKind = (v: unknown): v is NewsKind => typeof v === 'string' && (NEWS_KINDS as readonly string[]).includes(v);
export const isEventKind = (v: unknown): v is EventKind => typeof v === 'string' && (EVENT_KINDS as readonly string[]).includes(v);
export const isFamilleVideo = (v: unknown): v is Exclude<Famille, 'accesLibre'> => typeof v === 'string' && (VIDEO_FAMILLES as readonly string[]).includes(v);
export const isNiveau = (v: unknown): v is Niveau => typeof v === 'string' && (NIVEAUX as readonly string[]).includes(v);
export const isObjectif = (v: unknown): v is Objectif => typeof v === 'string' && (OBJECTIFS as readonly string[]).includes(v);
export const isSecurite = (v: unknown): v is Securite => typeof v === 'string' && (SECURITES as readonly string[]).includes(v);
