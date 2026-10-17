import { create } from 'zustand';

import { MEMBER, type Member } from '@/data/member';

/**
 * Session de démonstration. En production : jeton Supabase, fiche membre lue
 * par le connecteur Deciplus, secret d’appareil en SecureStore.
 */
type SessionState = {
  member: Member;
  deviceSecret: string;
  setStatut: (statut: Member['statut']) => void;
};

function demoSecret(): string {
  // Un secret stable par session de démo ; jamais celui de production.
  return 'demo-' + Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
}

export const useSession = create<SessionState>((set) => ({
  member: MEMBER,
  deviceSecret: demoSecret(),
  setStatut: (statut) => set((s) => ({ member: { ...s.member, statut } })),
}));
