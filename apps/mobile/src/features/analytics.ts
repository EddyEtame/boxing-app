import { API, cleanProps, type AnalyticsEvent, type EventName } from '@bc/contract';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { useI18nStore } from '@/i18n';
import { useSession } from '@/state/session';
import { IS_SERVER, persistStorage } from '@/state/storage';
import { useUsage } from '@/state/usage';

/**
 * La mesure d'usage (CDC §15 ; Eddy, 20/10/2026 : « surtout les non-membres »).
 * Chaque geste compte deux fois : sur le téléphone, pour personnaliser l'app
 * (state/usage), et, anonymement, vers l'admin, pour comprendre l'expérience.
 *
 * Rien ne part sans EXPO_PUBLIC_API_URL ; rien ne part si la personne a coupé
 * la mesure ; les événements attendent en file (500 au plus) et partent par
 * lots. Aucune donnée nominative : voir le contrat (packages/contract/events).
 */
const API_URL = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '');
const VISIT_GAP = 30 * 60 * 1000;
const MAX_QUEUE = 500;
const BATCH = 25;

type QueueState = { queue: AnalyticsEvent[]; visit: string; lastAt: number; push: (e: AnalyticsEvent, visit: string, at: number) => void; drop: (n: number) => void };

const useQueue = create<QueueState>()(
  persist(
    (set) => ({
      queue: [],
      visit: '',
      lastAt: 0,
      push: (e, visit, at) => set((s) => ({ queue: [...s.queue, e].slice(-MAX_QUEUE), visit, lastAt: at })),
      drop: (n) => set((s) => ({ queue: s.queue.slice(n) })),
    }),
    { name: 'bc-events', version: 1, storage: persistStorage, skipHydration: IS_SERVER, partialize: (s) => ({ queue: s.queue, visit: s.visit, lastAt: s.lastAt }) },
  ),
);

function newId(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}

let scheme: 'light' | 'dark' = 'light';
/** L'ambiance affichée, posée par la racine (le store ne connaît que la préférence). */
export function setAnalyticsScheme(s: 'light' | 'dark') {
  scheme = s;
}

export function track(name: EventName, props?: Record<string, unknown>, path?: string) {
  if (IS_SERVER) return;
  const usage = useUsage.getState();
  if (!usage.analytics) return;
  const now = Date.now();
  const q = useQueue.getState();
  const visit = q.visit && now - q.lastAt < VISIT_GAP ? q.visit : newId();
  const event: AnalyticsEvent = {
    id: newId(),
    name,
    at: new Date(now).toISOString(),
    anonId: usage.anonId,
    visit,
    statut: useSession.getState().member.statut,
    locale: useI18nStore.getState().locale,
    scheme,
    platform: Platform.OS === 'ios' || Platform.OS === 'android' ? Platform.OS : 'web',
    appVersion: Constants.expoConfig?.version ?? '0.0.0',
    path,
    props: cleanProps(props),
  };
  q.push(event, visit, now);
  if (q.queue.length + 1 >= BATCH) void flush();
}

let flushing = false;
export async function flush(): Promise<void> {
  if (!API_URL || flushing) return;
  const { queue, drop } = useQueue.getState();
  if (!queue.length) return;
  flushing = true;
  try {
    const events = queue.slice(0, 100);
    const res = await fetch(`${API_URL}${API.events}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ events }) });
    if (res.ok) drop(events.length);
  } catch {
    // Hors ligne : la file attend le prochain passage.
  } finally {
    flushing = false;
  }
}

/** Le dernier chemin vu, pour éviter de compter deux fois le même écran. */
let lastPath = '';
export function trackScreen(path: string) {
  if (path === lastPath) return;
  lastPath = path;
  const section = path.split('/')[1] || 'home';
  useUsage.getState().bump('sections', section);
  track('screen_view', { section }, path);
}

/** Démarre l'envoi périodique ; à appeler une fois depuis la racine. */
export function startAnalytics() {
  if (IS_SERVER || !API_URL) return () => {};
  const id = setInterval(() => void flush(), 20_000);
  void flush();
  return () => clearInterval(id);
}

/** Vide la file (suppression du compte, désactivation de la mesure). */
export function clearAnalytics() {
  useQueue.setState({ queue: [], visit: '', lastAt: 0 });
}

