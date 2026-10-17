import { useEffect } from 'react';
import { create } from 'zustand';

/**
 * L’horloge du jeton, partagée par toute l’app (poignée de la barre, accueil,
 * badge). Le code change toutes les 60 s ; le lecteur accepte aussi la fenêtre
 * précédente, donc jamais de code refusé à la seconde près.
 */
export const WINDOW_SECONDS = 60;

type ClockState = {
  windowSeconds: number;
  secondsLeft: number;
  window: number;
  tick: () => void;
};

export const useBadgeClock = create<ClockState>((set) => ({
  windowSeconds: WINDOW_SECONDS,
  secondsLeft: WINDOW_SECONDS,
  window: 0,
  tick: () => {
    const s = Math.floor(Date.now() / 1000);
    set({ windowSeconds: WINDOW_SECONDS, secondsLeft: WINDOW_SECONDS - (s % WINDOW_SECONDS), window: Math.floor(s / WINDOW_SECONDS) });
  },
}));

/** À monter une fois, à la racine. */
export function useBadgeClockTicker() {
  const tick = useBadgeClock((s) => s.tick);
  useEffect(() => {
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [tick]);
}

export function formatClock(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
