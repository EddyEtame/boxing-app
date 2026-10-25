import { computeStats, type Passage, type Stats, type StatsOptions } from '@bc/contract';
import { useMemo } from 'react';

import { useSession } from '@/state/session';
import { useUsage } from '@/state/usage';

export { computeStats, momentOf, type DayCell, type Moment, type Stats, type WeekPoint } from '@bc/contract';

const AUCUN: Passage[] = [];

/** Les passages lus sur la fiche. Vides tant que la source n'est pas branchee. */
export function usePassages(): Passage[] {
  return useSession((s) => s.me?.passages ?? AUCUN);
}

export function useStats(options: Omit<StatsOptions, 'goal'> = {}): Stats {
  const passages = usePassages();
  const goal = useUsage((s) => s.weeklyGoal);
  const { weeks, heatWeeks, month } = options;
  const monthKey = month ? `${month.year}-${month.month}` : '';
  return useMemo(
    () => computeStats(passages, new Date(), { goal, weeks, heatWeeks, month }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `month` est suivi par sa cle.
    [passages, goal, weeks, heatWeeks, monthKey],
  );
}
