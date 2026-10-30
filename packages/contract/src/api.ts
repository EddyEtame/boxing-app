import type { Passage } from './passages';

/**
 * Les routes que l'app appelle sur le serveur (l'admin Next.js tant que le
 * serveur applicatif n'existe pas). L'app ne les appelle que si
 * EXPO_PUBLIC_API_URL est défini ; sinon elle reste sur ses données locales.
 */
export const API = {
  /** POST EventBatch → 204. */
  events: '/api/events',
  /** GET → DemoPassagesResponse ; PUT (admin authentifié) → idem. */
  demoPassages: (memberId: string) => `/api/demo/members/${encodeURIComponent(memberId)}/passages`,
} as const;

export type DemoPassagesResponse = {
  memberId: string;
  passages: Passage[];
  /** ISO 8601. */
  updatedAt: string;
  /** `demo` : fabriqué depuis l'admin ; `deciplus` : lu dans la base du club. */
  source: 'demo' | 'deciplus';
};

/** Le compte de démonstration : le seul dont l'admin peut réécrire les passages. */
export const DEMO_MEMBER_ID = '48213';

/**
 * Les routes du compte adhérent, sur le pont Deciplus (`apps/bridge`), à
 * l'adresse EXPO_PUBLIC_MEMBER_API_URL. Toutes exigent le jeton de session
 * Supabase en `Authorization: Bearer`, sauf `health`.
 */
export const MEMBER_API = {
  /** GET -> Me ; DELETE -> 204 (suppression du compte, obligation des stores). */
  me: '/v1/me',
  /** POST -> LinkResponse : lance le rapprochement avec la fiche Deciplus. */
  link: '/v1/link',
  /** POST -> Me : relit la fiche si la dernière lecture a plus de 6 heures. */
  refresh: '/v1/me/refresh',
  /** GET -> { ok: true } : le serveur répond. */
  health: '/health',
  /** POST -> CheckoutSessionResponse ; GET /v1/checkout/sessions/:id -> CheckoutSessionView. */
  checkoutSessions: '/v1/checkout/sessions',
  checkoutSession: (id: string) => `/v1/checkout/sessions/${encodeURIComponent(id)}`,
  /** GET -> InvoicesResponse. */
  invoices: '/v1/me/invoices',
  /** GET -> avis personnels (prelevement, resiliation). */
  notices: '/v1/me/notices',
} as const;
