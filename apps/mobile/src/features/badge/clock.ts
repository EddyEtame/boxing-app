import { useEffect } from 'react';
import { create } from 'zustand';

import { useDirection } from '@/state/direction';

/**
 * L’horloge du jeton, partagée par toute l’app (barre d’onglets, accueil, badge).
 * Direction A : le jeton vit un round (180 s) ; B et C : 30 s.
 */
type ClockState = {
  windowSeconds: number;
  secondsLeft: number;
  window: number;
  tick: (windowSeconds: number) => void;
};

export const WINDOW_BY_DIRECTION = { A: 180, B: 30, C: 30 } as const;

export const useBadgeClock = create<ClockState>((set) => ({
  windowSeconds: 30,
  secondsLeft: 30,
  window: 0,
  tick: (windowSeconds) => {
    const s = Math.floor(Date.now() / 1000);
    set({ windowSeconds, secondsLeft: windowSeconds - (s % windowSeconds), window: Math.floor(s / windowSeconds) });
  },
}));

/** À monter une fois, à la racine. */
export function useBadgeClockTicker() {
  const direction = useDirection((s) => s.direction);
  const tick = useBadgeClock((s) => s.tick);
  useEffect(() => {
    const w = WINDOW_BY_DIRECTION[direction];
    tick(w);
    const id = setInterval(() => tick(w), 1000);
    return () => clearInterval(id);
  }, [direction, tick]);
}

export function formatClock(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
