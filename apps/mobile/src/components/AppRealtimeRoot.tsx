import type { ReactNode } from 'react';

import { useLiveSignalSubscription } from '@/lib/app-realtime';

/** Demarre l'ecoute Realtime (bus live_signals) des le lancement de l'app. */
export function AppRealtimeRoot({ children }: { children: ReactNode }) {
  useLiveSignalSubscription();
  return children;
}
