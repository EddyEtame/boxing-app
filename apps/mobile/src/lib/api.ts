import {
  MEMBER_API,
  type CheckoutSessionRequest,
  type CheckoutSessionResponse,
  type CheckoutSessionView,
  type InvoicesResponse,
  type LinkResponse,
  type Me,
} from '@bc/contract';

import { MEMBER_API_URL } from '@/lib/config';
import { supabase } from '@/lib/supabase';

export type ApiErrorCode =
  | 'hors_ligne'
  | 'non_autorise'
  | 'email_non_verifie'
  | 'trop_de_demandes'
  | 'robot_indisponible'
  | 'profil_incomplet'
  | 'serveur';

export class ApiError extends Error {
  code: ApiErrorCode;
  status: number;

  constructor(code: ApiErrorCode, status = 0) {
    super(code);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
  }
}

const DELAI_MS = 20_000;

type Options = {
  method?: 'GET' | 'POST' | 'DELETE';
  auth?: boolean;
  body?: string;
};

function codePour(status: number, error: string | undefined): ApiErrorCode {
  if (status === 401) return 'non_autorise';
  if (status === 403 && error === 'email_non_verifie') return 'email_non_verifie';
  if (status === 409) return 'profil_incomplet';
  if (status === 429 || error === 'trop_de_demandes') return 'trop_de_demandes';
  if (status === 503 || error === 'robot_indisponible') return 'robot_indisponible';
  return 'serveur';
}

async function appel<T>(path: string, options: Options = {}): Promise<T> {
  if (!MEMBER_API_URL) throw new ApiError('serveur');
  const headers: Record<string, string> = { accept: 'application/json' };
  if (options.body) headers['content-type'] = 'application/json';
  if (options.auth !== false) {
    const jeton = (await supabase?.auth.getSession())?.data.session?.access_token;
    if (!jeton) throw new ApiError('non_autorise', 401);
    headers.authorization = `Bearer ${jeton}`;
  }
  const controle = new AbortController();
  const minuteur = setTimeout(() => controle.abort(), DELAI_MS);
  let res: Response;
  try {
    res = await fetch(`${MEMBER_API_URL}${path}`, {
      method: options.method ?? 'GET',
      headers,
      body: options.body,
      signal: controle.signal,
    });
  } catch {
    throw new ApiError('hors_ligne');
  } finally {
    clearTimeout(minuteur);
  }
  if (res.status === 204) return undefined as T;
  if (!res.ok) {
    let error: string | undefined;
    try {
      const body = (await res.json()) as { error?: unknown };
      if (typeof body.error === 'string') error = body.error;
    } catch {
      // Corps vide ou non JSON.
    }
    throw new ApiError(codePour(res.status, error), res.status);
  }
  return (await res.json()) as T;
}

export function lireMe(): Promise<Me> {
  return appel<Me>(MEMBER_API.me);
}

export function rafraichirMe(): Promise<Me> {
  return appel<Me>(MEMBER_API.refresh, { method: 'POST' });
}

export function lancerLien(): Promise<LinkResponse> {
  return appel<LinkResponse>(MEMBER_API.link, { method: 'POST' });
}

export function supprimerCompte(): Promise<void> {
  return appel<void>(MEMBER_API.me, { method: 'DELETE' });
}

export function creerSessionCheckout(body: CheckoutSessionRequest): Promise<CheckoutSessionResponse> {
  return appel<CheckoutSessionResponse>(MEMBER_API.checkoutSessions, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function lireSessionCheckout(id: string): Promise<CheckoutSessionView> {
  return appel<CheckoutSessionView>(MEMBER_API.checkoutSession(id));
}

export function lireFactures(): Promise<InvoicesResponse> {
  return appel<InvoicesResponse>(MEMBER_API.invoices);
}
