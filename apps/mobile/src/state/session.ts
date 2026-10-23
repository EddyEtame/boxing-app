import type { Passage } from '@bc/contract';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { MEMBER, type Member } from '@/data/member';
import type { ClubId } from '@/ui/theme';

import { IS_SERVER, persistStorage } from './storage';

/**
 * La session, gardée sur le téléphone (23/10/2026, Eddy, après l'essai de l'APK :
 * « l'invité doit rester invité ; pas de "Salut Camille" quand on n'a pas créé de
 * compte »). Sans serveur, trois cas :
 * - aucun compte : la vitrine (invité), et elle le reste d'un lancement à l'autre ;
 * - compte créé sur ce téléphone : prénom, nom, e-mail, date de naissance et club
 *   saisis (jamais le mot de passe), avec l'abonnement de démonstration ;
 * - connexion : le compte de démonstration (Camille Durand), annoncé comme tel
 *   sur l'écran de connexion.
 * En production : jeton signé lié à l'appareil, fiche lue dans Deciplus, secret
 * du badge en SecureStore (.research/08-SECURITE.md). Rien de tout cela ici.
 */
export type Account =
  | { kind: 'none' }
  | { kind: 'created'; prenom: string; nom: string; email: string; dateNaissance: string; club: ClubId }
  | { kind: 'demo'; email: string };

export type NewAccount = { prenom: string; nom: string; email: string; dateNaissance: string; club: ClubId };

type SessionState = {
  hydrated: boolean;
  account: Account;
  /** Statut forcé par l'interrupteur de démonstration (développement) ; sinon déduit du compte. */
  statut: Member['statut'];
  member: Member;
  deviceSecret: string;
  /** Les clubs que l'adhérent a choisis, dans son ordre. Le premier est le club habituel. */
  clubsChoisis: ClubId[];
  /** Le club que l'accueil et le planning montrent en ce moment. */
  clubActif: ClubId;
  setStatut: (statut: Member['statut']) => void;
  setClubs: (clubs: ClubId[]) => void;
  setClubActif: (club: ClubId) => void;
  /** Démonstration : rejoue un historique de passages fabriqué (jamais enregistré). */
  setPassages: (passages: Passage[]) => void;
  createAccount: (a: NewAccount) => void;
  signIn: (email: string) => void;
  signOut: () => void;
};

function demoSecret(): string {
  // Un secret par lancement, de démonstration ; jamais celui de production.
  return 'demo-' + Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
}

/** La fiche affichée, déduite du compte et du statut. Les passages restent ceux du moment. */
function memberFor(account: Account, statut: Member['statut'], passages: Passage[]): Member {
  if (account.kind === 'created') {
    return { ...MEMBER, prenom: account.prenom, nom: account.nom, dateNaissance: account.dateNaissance, clubPrincipal: account.club, statut, passages };
  }
  // Sans compte, l'interrupteur de développement peut montrer l'adhérent de démonstration.
  return { ...MEMBER, statut, passages };
}

const GUEST_CLUBS: ClubId[] = [MEMBER.clubPrincipal];

export const useSession = create<SessionState>()(
  persist(
    (set, get) => ({
      hydrated: false,
      account: { kind: 'none' },
      statut: 'invite',
      member: memberFor({ kind: 'none' }, 'invite', MEMBER.passages),
      deviceSecret: demoSecret(),
      clubsChoisis: GUEST_CLUBS,
      clubActif: MEMBER.clubPrincipal,
      setStatut: (statut) => set((s) => ({ statut, member: memberFor(s.account, statut, s.member.passages) })),
      setClubs: (clubs) => {
        const list = clubs.length ? clubs : [get().member.clubPrincipal];
        set({ clubsChoisis: list, clubActif: list.includes(get().clubActif) ? get().clubActif : list[0] });
      },
      setClubActif: (clubActif) => set({ clubActif }),
      setPassages: (passages) => set((s) => ({ member: { ...s.member, passages } })),
      createAccount: (a) => {
        const account: Account = { kind: 'created', ...a, email: a.email.trim().toLowerCase() };
        set((s) => ({ account, statut: 'actif', member: memberFor(account, 'actif', s.member.passages), clubsChoisis: [a.club], clubActif: a.club }));
      },
      signIn: (email) => {
        const account: Account = { kind: 'demo', email: email.trim().toLowerCase() };
        set((s) => ({
          account,
          statut: 'actif',
          member: memberFor(account, 'actif', s.member.passages),
          clubsChoisis: [MEMBER.clubPrincipal, 'saint-cyprien'],
          clubActif: MEMBER.clubPrincipal,
        }));
      },
      signOut: () =>
        set((s) => ({ account: { kind: 'none' }, statut: 'invite', member: memberFor({ kind: 'none' }, 'invite', s.member.passages), clubsChoisis: GUEST_CLUBS, clubActif: MEMBER.clubPrincipal })),
    }),
    {
      name: 'bc-session',
      version: 1,
      storage: persistStorage,
      skipHydration: IS_SERVER,
      partialize: (s) => ({ account: s.account, statut: s.statut, clubsChoisis: s.clubsChoisis, clubActif: s.clubActif }),
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<Pick<SessionState, 'account' | 'statut' | 'clubsChoisis' | 'clubActif'>>;
        const account: Account = p.account && (p.account.kind === 'created' || p.account.kind === 'demo' || p.account.kind === 'none') ? p.account : { kind: 'none' };
        const statut: Member['statut'] = p.statut === 'actif' || p.statut === 'restreint' || p.statut === 'invite' ? p.statut : account.kind === 'none' ? 'invite' : 'actif';
        const clubsChoisis = Array.isArray(p.clubsChoisis) && p.clubsChoisis.length ? p.clubsChoisis : current.clubsChoisis;
        const clubActif = p.clubActif && clubsChoisis.includes(p.clubActif) ? p.clubActif : clubsChoisis[0];
        return { ...current, account, statut, clubsChoisis, clubActif, member: memberFor(account, statut, current.member.passages) };
      },
      onRehydrateStorage: () => () => {
        useSession.setState({ hydrated: true });
      },
    },
  ),
);

/** Invité = pas de compte : la vitrine. Adhérent (actif ou restreint) = l’espace personnel. */
export function useProfil(): 'invite' | 'adherent' {
  return useSession((s) => (s.member.statut === 'invite' ? 'invite' : 'adherent'));
}

/** « 12/04/1996 » → « 1996-04-12 », ou null si la date n'existe pas ou donne un âge impossible. */
export function parseBirthDate(input: string, now = new Date()): string | null {
  const m = input.trim().match(/^(\d{1,2})[/.\-\s](\d{1,2})[/.\-\s](\d{4})$/);
  if (!m) return null;
  const [d, mo, y] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(y, mo - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== mo - 1 || date.getDate() !== d) return null;
  const age = now.getFullYear() - y - (now < new Date(now.getFullYear(), mo - 1, d) ? 1 : 0);
  if (age < 3 || age > 100) return null;
  return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}
