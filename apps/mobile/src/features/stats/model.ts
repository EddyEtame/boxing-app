import { API, computeStats, type DemoPassagesResponse, type Passage, type Stats, type StatsOptions } from '@bc/contract';
import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';

import { useSession } from '@/state/session';
import { useUsage } from '@/state/usage';

export { computeStats, momentOf, type DayCell, type Moment, type Stats, type WeekPoint } from '@bc/contract';

/**
 * Les statistiques de fréquentation (CDC §6). Le calcul vit dans @bc/contract :
 * l'app et l'admin lisent exactement les mêmes chiffres.
 *
 * Mode démonstration : si EXPO_PUBLIC_API_URL est défini, les passages viennent
 * de l'admin (où l'équipe les règle pour une présentation), relus toutes les
 * cinq secondes tant que l'écran est ouvert. Sinon, les passages locaux.
 */
const API_URL = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '');

export function usePassages(): Passage[] {
  const local = useSession((s) => s.member.passages);
  const memberId = useSession((s) => s.member.deciplusId);
  const [remote, setRemote] = useState<Passage[] | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!API_URL) return undefined;
      let alive = true;
      const load = async () => {
        try {
          const res = await fetch(`${API_URL}${API.demoPassages(memberId)}`);
          if (!res.ok) return;
          const body = (await res.json()) as DemoPassagesResponse;
          if (alive && Array.isArray(body.passages)) setRemote(body.passages);
        } catch {
          // Pas de serveur : on garde les passages locaux.
        }
      };
      void load();
      const id = setInterval(load, 5000);
      return () => {
        alive = false;
        clearInterval(id);
      };
    }, [memberId]),
  );

  return remote ?? local;
}

export function useStats(options: Omit<StatsOptions, 'goal'> = {}): Stats {
  const passages = usePassages();
  const goal = useUsage((s) => s.weeklyGoal);
  const { weeks, heatWeeks, month } = options;
  const monthKey = month ? `${month.year}-${month.month}` : '';
  return useMemo(
    () => computeStats(passages, new Date(), { goal, weeks, heatWeeks, month }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `month` est suivi par sa clé.
    [passages, goal, weeks, heatWeeks, monthKey],
  );
}
