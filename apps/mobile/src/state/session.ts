import { create } from 'zustand';

import type { Passage } from '@bc/contract';

import { MEMBER, type Member } from '@/data/member';
import type { ClubId } from '@/ui/theme';

/**
 * Session de démonstration. En production : jeton d’accès signé et lié à
 * l’appareil, fiche membre lue par le connecteur Deciplus, secret du badge en
 * SecureStore (voir .research/08-SECURITE.md).
 *
 * La personnalisation commence ici : l’adhérent choisit ses clubs ; l’accueil,
 * le planning et les propositions suivent le club actif.
 */
type SessionState = {
  member: Member;
  deviceSecret: string;
  /** Les clubs que l’adhérent a choisis, dans son ordre. Le premier est le club habituel. */
  clubsChoisis: ClubId[];
  /** Le club que l’accueil et le planning montrent en ce moment. */
  clubActif: ClubId;
  setStatut: (statut: Member['statut']) => void;
  setClubs: (clubs: ClubId[]) => void;
  setClubActif: (club: ClubId) => void;
  /** Démonstration : rejoue un historique de passages fabriqué. */
  setPassages: (passages: Passage[]) => void;
};

function demoSecret(): string {
  // Un secret stable par session de démo ; jamais celui de production.
  return 'demo-' + Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
}

export const useSession = create<SessionState>((set, get) => ({
  member: MEMBER,
  deviceSecret: demoSecret(),
  clubsChoisis: [MEMBER.clubPrincipal, 'saint-cyprien'],
  clubActif: MEMBER.clubPrincipal,
  setStatut: (statut) => set((s) => ({ member: { ...s.member, statut } })),
  setClubs: (clubs) => {
    const list = clubs.length ? clubs : [get().member.clubPrincipal];
    set({ clubsChoisis: list, clubActif: list.includes(get().clubActif) ? get().clubActif : list[0] });
  },
  setClubActif: (clubActif) => set({ clubActif }),
  setPassages: (passages) => set((s) => ({ member: { ...s.member, passages } })),
}));

/** Invité = pas de compte : la vitrine. Adhérent (actif ou restreint) = l’espace personnel. */
export function useProfil(): 'invite' | 'adherent' {
  return useSession((s) => (s.member.statut === 'invite' ? 'invite' : 'adherent'));
}
