import { SNAPSHOT_REFRESH_MS, type Me, type Statut } from '@bc/contract';
import { AppState } from 'react-native';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { ApiError, lireMe, rafraichirMe, supprimerCompte } from '@/lib/api';
import { activerRafraichissementFond, arreterRafraichissementFond } from '@/lib/background';
import { configReady } from '@/lib/config';
import { supabase } from '@/lib/supabase';
import { IS_SERVER, persistStorage } from '@/state/storage';
import type { ClubId } from '@/ui/theme';

export type AuthPhase = 'chargement' | 'deconnecte' | 'connecte';

const CLUBS: ClubId[] = ['minimes', 'saint-cyprien', 'etats-unis', 'ramonville', 'portet'];
const CLUB_DEFAUT: ClubId = 'minimes';

type SessionState = {
  auth: AuthPhase;
  me: Me | null;
  erreur: ApiError['code'] | null;
  clubsChoisis: ClubId[];
  clubActif: ClubId;
  /** Vrai des que l'adherent a touche la liste (on ne l'ecrase plus avec la fiche). */
  clubsChoisisParLui: boolean;
  clubsHydrated: boolean;
  setClubs: (clubs: ClubId[]) => void;
  setClubActif: (club: ClubId) => void;
  applyMe: (me: Me) => void;
  boot: () => Promise<void>;
  recharger: () => Promise<void>;
  signOut: () => Promise<void>;
  supprimer: () => Promise<void>;
};

function estClub(id: unknown): id is ClubId {
  return CLUBS.includes(id as ClubId);
}

function nettoyerClubs(value: unknown): ClubId[] {
  if (!Array.isArray(value)) return [CLUB_DEFAUT];
  const liste = value.filter(estClub);
  const uniques = liste.filter((id, i) => liste.indexOf(id) === i);
  return uniques.length ? uniques : [CLUB_DEFAUT];
}

function clubsApresFiche(
  actuel: { clubsChoisis: ClubId[]; clubActif: ClubId; clubsChoisisParLui: boolean },
  principal: ClubId | null,
): { clubsChoisis: ClubId[]; clubActif: ClubId } {
  if (!actuel.clubsChoisisParLui && principal) {
    return { clubsChoisis: [principal], clubActif: principal };
  }
  const clubs = principal && !actuel.clubsChoisis.includes(principal) ? [principal, ...actuel.clubsChoisis] : actuel.clubsChoisis;
  return { clubsChoisis: clubs, clubActif: clubs.includes(actuel.clubActif) ? actuel.clubActif : clubs[0] };
}

let demarre = false;
let ecoutePosee = false;

function attendreClubs(): Promise<void> {
  if (useSession.getState().clubsHydrated) return Promise.resolve();
  return new Promise((resolve) => {
    const arret = useSession.subscribe((s) => {
      if (!s.clubsHydrated) return;
      arret();
      resolve();
    });
  });
}

export const useSession = create<SessionState>()(
  persist(
    (set, get) => ({
      auth: 'chargement',
      me: null,
      erreur: null,
      clubsChoisis: [CLUB_DEFAUT],
      clubActif: CLUB_DEFAUT,
      clubsChoisisParLui: false,
      clubsHydrated: IS_SERVER,
      setClubs: (clubs) => {
        const base = get().me?.clubPrincipal ?? get().clubActif;
        const liste = clubs.length ? clubs : [base];
        set({
          clubsChoisis: liste,
          clubsChoisisParLui: true,
          clubActif: liste.includes(get().clubActif) ? get().clubActif : liste[0],
        });
      },
      setClubActif: (clubActif) => set({ clubActif }),
      applyMe: (me) => {
        const clubs = clubsApresFiche(get(), me.clubPrincipal);
        set({ me, auth: 'connecte', erreur: null, ...clubs });
      },
      boot: async () => {
        if (demarre) return;
        demarre = true;
        try {
          await attendreClubs();
          if (!configReady || !supabase) {
            set({ auth: 'deconnecte', me: null });
            return;
          }
          const { data } = await supabase.auth.getSession();
          if (!data.session) set({ auth: 'deconnecte', me: null });
          else await chargerMe(get, set);
          if (!ecoutePosee) {
            ecoutePosee = true;
            supabase.auth.onAuthStateChange((event, session) => {
              if (event === 'SIGNED_OUT' || !session) {
                set({ auth: 'deconnecte', me: null, erreur: null });
                return;
              }
              if (event === 'SIGNED_IN') void chargerMe(get, set);
            });
            AppState.addEventListener('change', (state) => {
              if (state === 'active') void rafraichirSiAncien();
            });
          }
          if (data.session) void rafraichirSiAncien();
        } catch {
          set({ auth: 'deconnecte', me: null, erreur: 'hors_ligne' });
        }
      },
      recharger: async () => {
        if (get().auth !== 'connecte') return;
        await chargerMe(get, set);
      },
      signOut: async () => {
        await arreterRafraichissementFond();
        await supabase?.auth.signOut();
        set({ auth: 'deconnecte', me: null, erreur: null });
      },
      supprimer: async () => {
        await supprimerCompte();
        await get().signOut();
      },
    }),
    {
      name: 'bc-clubs',
      version: 1,
      storage: persistStorage,
      skipHydration: IS_SERVER,
      partialize: (s) => ({ clubsChoisis: s.clubsChoisis, clubActif: s.clubActif, clubsChoisisParLui: s.clubsChoisisParLui }),
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<SessionState>;
        const clubsChoisis = nettoyerClubs(p.clubsChoisis);
        const clubActif = estClub(p.clubActif) && clubsChoisis.includes(p.clubActif) ? p.clubActif : clubsChoisis[0];
        return { ...current, clubsChoisis, clubActif, clubsChoisisParLui: p.clubsChoisisParLui === true };
      },
      onRehydrateStorage: () => () => {
        useSession.setState({ clubsHydrated: true });
      },
    },
  ),
);

type Get = () => SessionState;
type Set = (partial: Partial<SessionState>) => void;

async function chargerMe(get: Get, set: Set): Promise<void> {
  try {
    const me = await lireMe();
    get().applyMe(me);
    await activerRafraichissementFond();
  } catch (e) {
    if (e instanceof ApiError && e.code === 'non_autorise') {
      await arreterRafraichissementFond();
      await supabase?.auth.signOut();
      set({ auth: 'deconnecte', me: null, erreur: null });
      return;
    }
    set({ auth: 'connecte', me: get().me, erreur: e instanceof ApiError ? e.code : 'serveur' });
  }
}

/** Relit la fiche si la derniere lecture a plus de 6 heures. Utilise aussi par la tache de fond. */
export async function rafraichirSiAncien(): Promise<boolean> {
  if (!supabase) return true;
  const { data } = await supabase.auth.getSession();
  if (!data.session) return true;
  try {
    let me = useSession.getState().me;
    if (!me) {
      me = await lireMe();
      useSession.getState().applyMe(me);
    }
    const lu = me.snapshot?.readAt ? Date.parse(me.snapshot.readAt) : NaN;
    if (Number.isFinite(lu) && Date.now() - lu < SNAPSHOT_REFRESH_MS) return true;
    const suivant = await rafraichirMe();
    useSession.getState().applyMe(suivant);
    return true;
  } catch (e) {
    if (e instanceof ApiError && e.code === 'non_autorise') {
      await useSession.getState().signOut();
    }
    return false;
  }
}

export function selectStatut(s: { auth: AuthPhase; me: Me | null }): Statut {
  if (s.auth === 'connecte' && s.me) return s.me.statut;
  return 'invite';
}

/** Invite sans session. Des qu'une session existe, c'est l'espace adherent. */
export function useProfil(): 'invite' | 'adherent' {
  return useSession((s) => (s.auth === 'connecte' ? 'adherent' : 'invite'));
}

export function bootSession(): void {
  if (IS_SERVER) {
    useSession.setState({ auth: 'deconnecte', clubsHydrated: true });
    return;
  }
  void useSession.getState().boot();
}
