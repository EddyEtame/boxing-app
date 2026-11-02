import {
  ADMIN_API,
  THREAD_TOKEN_HEADER,
  type ContentList,
  type FeaturesResponse,
  type MemberMessageRequest,
  type MemberMessageResponse,
  type MemberThreadsResponse,
  type NotificationsResponse,
  type ParticipantsResponse,
  type ParticipationResponse,
  type PlanningResponse,
  type PublicError,
  type PublicEvent,
  type PublicNews,
  type PublicVideo,
  type ReceivedMessagesResponse,
  type Statut,
  type ThreadResponse,
  type TrainingsResponse,
  type TrainingCreated,
  type TrainingRequest,
} from '@bc/contract';
import type { ClubId } from '@bc/brand';

import { API_URL } from '@/lib/config';
import { supabase } from '@/lib/supabase';

export class AdminApiError extends Error {
  readonly code: PublicError['error'];
  readonly status: number;
  readonly retryAfter?: number;

  constructor(code: PublicError['error'], status = 0, retryAfter?: number) {
    super(code);
    this.name = 'AdminApiError';
    this.code = code;
    this.status = status;
    this.retryAfter = retryAfter;
  }
}

const DELAI_MS = 20_000;

async function lireErreur(res: Response): Promise<PublicError> {
  try {
    return (await res.json()) as PublicError;
  } catch {
    return { error: 'invalide' };
  }
}

async function adminFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!API_URL) throw new AdminApiError('off');
  const headers: Record<string, string> = { accept: 'application/json', ...(init.headers as Record<string, string>) };
  const controle = new AbortController();
  const minuteur = setTimeout(() => controle.abort(), DELAI_MS);
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, { ...init, headers, signal: controle.signal });
  } catch {
    throw new AdminApiError('invalide');
  } finally {
    clearTimeout(minuteur);
  }
  if (!res.ok) {
    const body = await lireErreur(res);
    throw new AdminApiError(body.error, res.status, body.retryAfter);
  }
  return (await res.json()) as T;
}

/**
 * Ce qui concerne un adhérent porte son jeton de session : c'est lui qui l'identifie
 * auprès de l'admin, et le seul qui traverse le relais du serveur.
 */
async function membreFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const jeton = supabase ? (await supabase.auth.getSession()).data.session?.access_token : undefined;
  return adminFetch<T>(path, { ...init, headers: { ...(init.headers as Record<string, string>), ...(jeton ? { authorization: `Bearer ${jeton}` } : {}) } });
}

export function lireNotifications(club: ClubId, statut: Statut): Promise<NotificationsResponse> {
  const q = new URLSearchParams({ club, statut });
  return adminFetch<NotificationsResponse>(`${ADMIN_API.notifications}?${q}`);
}

export type PlanningFetch =
  | { kind: 'fresh'; data: PlanningResponse; etag: string | null }
  | { kind: 'notModified' };

/** GET plannings avec revalidation ETag (304 conserve le cache memoire). */
export async function lirePlannings(ifNoneMatch?: string): Promise<PlanningFetch> {
  if (!API_URL) throw new AdminApiError('off');
  const headers: Record<string, string> = { accept: 'application/json' };
  if (ifNoneMatch) headers['If-None-Match'] = ifNoneMatch;
  const controle = new AbortController();
  const minuteur = setTimeout(() => controle.abort(), DELAI_MS);
  let res: Response;
  try {
    res = await fetch(`${API_URL}${ADMIN_API.plannings}`, { headers, signal: controle.signal });
  } catch {
    throw new AdminApiError('invalide');
  } finally {
    clearTimeout(minuteur);
  }
  if (res.status === 304) return { kind: 'notModified' };
  if (!res.ok) {
    const body = await lireErreur(res);
    throw new AdminApiError(body.error, res.status, body.retryAfter);
  }
  const etag = res.headers.get('etag');
  return { kind: 'fresh', data: (await res.json()) as PlanningResponse, etag };
}

export function lireActualites(): Promise<ContentList<PublicNews>> {
  return adminFetch<ContentList<PublicNews>>(ADMIN_API.actualites);
}

export function lireEvenements(): Promise<ContentList<PublicEvent>> {
  return adminFetch<ContentList<PublicEvent>>(ADMIN_API.evenements);
}

export function lireVideos(): Promise<ContentList<PublicVideo>> {
  return adminFetch<ContentList<PublicVideo>>(ADMIN_API.videos);
}

export function lireLecture(id: string, accessToken?: string): Promise<{ url: string; expiresAt: string }> {
  const headers: Record<string, string> = {};
  if (accessToken) headers.authorization = `Bearer ${accessToken}`;
  return adminFetch<{ url: string; expiresAt: string }>(`/api/videos/${encodeURIComponent(id)}/lecture`, { headers });
}

export function lireFonctions(): Promise<FeaturesResponse> {
  return adminFetch<FeaturesResponse>(ADMIN_API.fonctions);
}

export function lireEntrainements(club: ClubId): Promise<TrainingsResponse> {
  const q = new URLSearchParams({ club });
  return membreFetch<TrainingsResponse>(`${ADMIN_API.entrainements}?${q}`);
}

/** `organisateur` reste envoyé pour l'admin déjà en ligne ; le nouveau le lit dans le jeton de session et l'ignore. */
export function proposerEntrainement(body: TrainingRequest): Promise<TrainingCreated> {
  return membreFetch<TrainingCreated>(ADMIN_API.entrainements, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

/** « Je participe » et son annulation (CDC §11 B, C) : le même appel répété ne compte qu'une fois. */
export function participer(trainingId: string): Promise<ParticipationResponse> {
  return membreFetch<ParticipationResponse>(ADMIN_API.participation(trainingId), { method: 'POST' });
}

export function annulerParticipation(trainingId: string): Promise<ParticipationResponse> {
  return membreFetch<ParticipationResponse>(ADMIN_API.participation(trainingId), { method: 'DELETE' });
}

/** Les prénoms des inscrits : l'organisateur seul (CDC §11 C). */
export function lireParticipants(trainingId: string): Promise<ParticipantsResponse> {
  return membreFetch<ParticipantsResponse>(ADMIN_API.participants(trainingId));
}

/** Les fils de cet adhérent : ils se retrouvent avec le compte, sur un autre téléphone ou après une reconnexion. */
export function lireFils(): Promise<MemberThreadsResponse> {
  return membreFetch<MemberThreadsResponse>(ADMIN_API.messagesFils);
}

/** Ce que les coachs et l'équipe lui ont écrit (CDC §10) : en lecture. */
export function lireMessagesRecus(): Promise<ReceivedMessagesResponse> {
  return membreFetch<ReceivedMessagesResponse>(ADMIN_API.messagesRecus);
}

/** Le jeton du fil accompagne celui de la session pour l'admin déjà en ligne, qui ne connaît que le premier. */
export function envoyerMessage(body: MemberMessageRequest, token?: string | null): Promise<MemberMessageResponse> {
  return membreFetch<MemberMessageResponse>(ADMIN_API.messages, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(token ? { [THREAD_TOKEN_HEADER]: token } : {}) },
    body: JSON.stringify(body),
  });
}

export function lireFil(threadId: string, token?: string | null): Promise<ThreadResponse> {
  return membreFetch<ThreadResponse>(ADMIN_API.message(threadId), {
    headers: token ? { [THREAD_TOKEN_HEADER]: token } : {},
  });
}
