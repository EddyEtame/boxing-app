import type { PlanningResponse, PublicHoraire } from '@bc/contract';
import { create } from 'zustand';

import { SLOTS, type Slot } from '@/data/planning';
import { AdminApiError, lirePlannings } from '@/lib/admin-api';
import { API_URL } from '@/lib/config';
import type { ClubId } from '@/ui/theme';

type Source = 'local' | 'network';

type PlanningState = {
  slots: Slot[];
  horaires: Record<ClubId, PublicHoraire[]> | null;
  cancellations: PlanningResponse['cancellations'];
  fermetures: PlanningResponse['fermetures'];
  version: string | null;
  source: Source;
  loading: boolean;
  /** Dernier ETag servi par l'admin (If-None-Match). */
  etag: string | null;
  refresh: () => Promise<void>;
};

function mapSlots(response: PlanningResponse): Slot[] {
  return response.slots.map((s) => ({
    id: s.id,
    club: s.club as ClubId,
    espace: s.espace,
    jour: s.jour,
    debut: s.debut,
    fin: s.fin,
    activite: s.activite,
  }));
}

function applyLocal(set: (partial: Partial<PlanningState>) => void): void {
  set({
    slots: SLOTS,
    horaires: null,
    cancellations: [],
    fermetures: [],
    version: null,
    source: 'local',
  });
}

export const usePlanningStore = create<PlanningState>((set, get) => ({
  slots: SLOTS,
  horaires: null,
  cancellations: [],
  fermetures: [],
  version: null,
  source: 'local',
  loading: false,
  etag: null,
  refresh: async () => {
    if (!API_URL) {
      applyLocal(set);
      return;
    }
    if (get().loading) return;
    set({ loading: true });
    try {
      const res = await lirePlannings(get().etag ?? undefined);
      if (res.kind === 'notModified') return;
      set({
        slots: mapSlots(res.data),
        horaires: res.data.horaires as Record<ClubId, PublicHoraire[]>,
        cancellations: res.data.cancellations,
        fermetures: res.data.fermetures,
        version: res.data.version,
        etag: res.etag ?? get().etag,
        source: 'network',
      });
    } catch (e) {
      if (!(e instanceof AdminApiError) || get().source !== 'network') applyLocal(set);
    } finally {
      set({ loading: false });
    }
  },
}));

/** Creneaux effectifs : reseau en cache, sinon fichier local. */
export function planningSlots(): Slot[] {
  return usePlanningStore.getState().slots;
}
