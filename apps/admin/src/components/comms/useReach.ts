'use client';

import { useEffect, useState } from 'react';

import type { ActionResult } from '@/lib/action-result';
import type { Reach } from '@/lib/comms/types';
import type { ClubId, Statut } from '@/lib/types';

/**
 * La portée en direct : demandée au serveur 350 ms après le dernier changement
 * de cible, gardée en mémoire par cible (revenir sur une cible déjà vue ne
 * redemande rien). Le calcul lit la mesure d'usage, côté serveur seulement.
 */
type Target = { clubs: ClubId[] | 'all'; statuts: Statut[] };
type Fetcher = (target: Target) => Promise<ActionResult<Reach>>;

const cache = new Map<string, Reach>();

export function reachKey(target: Target): string {
  return JSON.stringify([target.clubs === 'all' ? 'all' : [...target.clubs].sort(), [...target.statuts].sort()]);
}

export function useReach(target: Target, fetcher: Fetcher): { reach: Reach | null; loading: boolean } {
  const key = reachKey(target);
  const [results, setResults] = useState<Record<string, Reach | 'error'>>({});

  useEffect(() => {
    if (cache.has(key)) return;
    let alive = true;
    const id = window.setTimeout(async () => {
      const [clubs, statuts] = JSON.parse(key) as [ClubId[] | 'all', Statut[]];
      const res = await fetcher({ clubs, statuts }).catch(() => null);
      if (!alive) return;
      if (res?.ok) cache.set(key, res.data);
      setResults((r) => ({ ...r, [key]: res?.ok ? res.data : 'error' }));
    }, 350);
    return () => {
      alive = false;
      window.clearTimeout(id);
    };
  }, [key, fetcher]);

  const hit = cache.get(key) ?? results[key];
  return { reach: hit && hit !== 'error' ? hit : null, loading: hit === undefined };
}
