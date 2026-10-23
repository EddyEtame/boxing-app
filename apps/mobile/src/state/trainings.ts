import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { TRAININGS, type Training } from '@/data/trainings';

import { IS_SERVER, persistStorage } from './storage';

/**
 * Les séances entre membres (CDC §11), gardées sur le téléphone tant qu'il n'y a
 * pas de serveur : ce qu'on publie et ce qu'on rejoint survit à la fermeture de
 * l'app (23/10/2026). En production : tables `trainings` et
 * `training_participants`, modération par l'admin.
 */
type TrainingsState = {
  list: Training[];
  publish: (tr: Training) => void;
  toggle: (id: string) => void;
  reset: () => void;
};

export const useTrainings = create<TrainingsState>()(
  persist(
    (set) => ({
      list: TRAININGS,
      publish: (tr) => set((s) => ({ list: [tr, ...s.list.filter((x) => x.id !== tr.id)].slice(0, 60) })),
      toggle: (id) => set((s) => ({ list: s.list.map((tr) => (tr.id === id ? { ...tr, jeParticipe: !tr.jeParticipe, participants: Math.max(1, tr.participants + (tr.jeParticipe ? -1 : 1)) } : tr)) })),
      reset: () => set({ list: TRAININGS }),
    }),
    { name: 'bc-trainings', version: 1, storage: persistStorage, skipHydration: IS_SERVER, partialize: (s) => ({ list: s.list }) },
  ),
);
