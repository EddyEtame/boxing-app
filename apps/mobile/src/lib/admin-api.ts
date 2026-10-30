import {
  ADMIN_API,
  THREAD_TOKEN_HEADER,
  type MemberMessageRequest,
  type MemberMessageResponse,
  type NotificationsResponse,
  type PublicError,
  type Statut,
  type ThreadResponse,
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
