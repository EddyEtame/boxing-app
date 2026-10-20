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
