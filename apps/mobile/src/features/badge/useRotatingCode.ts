import { useEffect, useState } from 'react';

import { computeCode, type RotatingCode } from './rotatingCode';

/**
 * Tient le code tournant à jour : recalcul au changement de fenêtre, compte à
 * rebours chaque seconde. Le calcul est local, donc identique hors connexion.
 */
export function useRotatingCode(memberId: string, deviceSecret: string, windowSeconds: number, enabled = true) {
  const [code, setCode] = useState<RotatingCode | null>(null);
  const [left, setLeft] = useState(() => windowSeconds - (Math.floor(Date.now() / 1000) % windowSeconds));

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    let lastWindow = -1;

    const refresh = async () => {
      const s = Math.floor(Date.now() / 1000);
      const w = Math.floor(s / windowSeconds);
      if (w !== lastWindow) {
        lastWindow = w;
        const next = await computeCode(memberId, deviceSecret, windowSeconds);
        if (!cancelled) setCode(next);
      }
      if (!cancelled) setLeft(windowSeconds - (s % windowSeconds));
    };

    void refresh();
    const id = setInterval(() => void refresh(), 1000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [memberId, deviceSecret, windowSeconds, enabled]);

  return { code: enabled ? code : null, secondsLeft: left };
}
