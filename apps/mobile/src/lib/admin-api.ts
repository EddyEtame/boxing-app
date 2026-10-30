import {
  ADMIN_API,
  THREAD_TOKEN_HEADER,
  type ContentList,
  type FeaturesResponse,
  type MemberMessageRequest,
  type MemberMessageResponse,
  type NotificationsResponse,
  type PlanningResponse,
  type PublicError,
  type PublicEvent,
  type PublicNews,
  type PublicVideo,
  type Statut,
  type ThreadResponse,
  type TrainingsResponse,
  type TrainingCreated,
  type TrainingRequest,
} from '@bc/contract';
import type { ClubId } from '@bc/brand';

import { API_URL } from '@/lib/config';

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
  return adminFetch<TrainingsResponse>(`${ADMIN_API.entrainements}?${q}`);
}

export function proposerEntrainement(body: TrainingRequest): Promise<TrainingCreated> {
  return adminFetch<TrainingCreated>(ADMIN_API.entrainements, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export function envoyerMessage(body: MemberMessageRequest): Promise<MemberMessageResponse> {
  return adminFetch<MemberMessageResponse>(ADMIN_API.messages, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export function lireFil(threadId: string, token: string): Promise<ThreadResponse> {
  return adminFetch<ThreadResponse>(ADMIN_API.message(threadId), {
    headers: { [THREAD_TOKEN_HEADER]: token },
  });
}
