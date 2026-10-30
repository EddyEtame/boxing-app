import { useEffect } from 'react';

import { useFeaturesStore } from '@/state/features';
import { usePlanningStore } from '@/state/planning';

/** Charge planning et fonctions admin au demarrage (cache memoire). */
export function useAdminBootstrap() {
  const refreshPlanning = usePlanningStore((s) => s.refresh);
  const refreshFeatures = useFeaturesStore((s) => s.refresh);
  useEffect(() => {
    void refreshFeatures();
    void refreshPlanning();
  }, [refreshFeatures, refreshPlanning]);
}
