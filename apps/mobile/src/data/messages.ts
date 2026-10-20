import type { ClubId } from '@/ui/theme';

/**
 * La messagerie avec le club (CDC §10), réservée aux abonnés.
 *
 * Trois sortes de fils, et une règle du cahier des charges qui les sépare :
 *  - `direction` : le seul canal où l'adhérent écrit librement. La réponse est
 *    signée par le rôle de la personne du club qui répond (accueil, direction) ;
 *  - `coach` : un coach ou un membre du staff écrit à l'adhérent. Lecture seule :
 *    l'adhérent ne peut pas engager de conversation avec un coach ; il répond
 *    « via la direction », avec le contexte joint ;
 *  - `club` : les informations d'un club (fermeture, stage), lecture seule.
 *
 * Contenu de démonstration : la forme est celle que l'admin produira. Aucun
 * fait n'est inventé sur un club ; le stage de la Toussaint est réel.
 */
export type Sender = 'member' | 'staff' | 'auto';

export type Message = {
  id: string;
  from: Sender;
  /** Qui, au club, a écrit (« Accueil · Minimes », « Mehdi · coach »). */
  signature?: string;
  text: string;
  at: string;
  /** Contexte joint par l'app (message de coach auquel on répond, facture, badge). */
  context?: string;
};

export type Thread = {
  id: string;
  kind: 'direction' | 'coach' | 'club';
  /** Fiche coach (data/coachs) pour le portrait. */
  coachId?: string;
  club?: ClubId;
  title: string;
  subtitle: string;
  messages: Message[];
  unread: number;
};

export const SUJETS = ['general', 'acces', 'abonnement', 'info', 'admin'] as const;
export type Sujet = (typeof SUJETS)[number];

export const THREADS: Thread[] = [
  {
    id: 'direction',
    kind: 'direction',
    title: 'Boxing Center',
    subtitle: 'Direction et accueil des clubs',
    unread: 1,
    messages: [
      { id: 'd1', from: 'member', text: 'Bonjour, mon badge n’a pas fonctionné hier soir aux Minimes, j’ai dû passer par l’accueil.', at: '2026-10-14T18:12:00' },
      { id: 'd2', from: 'auto', text: 'Bien reçu. L’accueil des Minimes te répond ici, en général dans la journée (du lundi au samedi, 10h–21h30).', at: '2026-10-14T18:12:30' },
      {
        id: 'd3',
        from: 'staff',
        signature: 'Accueil · Minimes',
        text: 'Bonjour Camille, merci pour le message. Si le lecteur ne répond pas, donne les six chiffres du code comptoir à l’accueil : on te pointe tout de suite, ton passage compte quand même.',
        at: '2026-10-15T10:24:00',
      },
    ],
  },
  {
    id: 'coach-mehdi',
    kind: 'coach',
    coachId: 'mehdi',
    club: 'minimes',
    title: 'Mehdi',
    subtitle: 'Coach principal · Minimes',
    unread: 1,
    messages: [
      { id: 'm1', from: 'staff', signature: 'Mehdi · coach', text: 'Jeudi, on travaille la garde haute en opposition légère. Protège-dents et casque obligatoires, pense à les prendre.', at: '2026-10-16T17:30:00' },
    ],
  },
  {
    id: 'club-minimes',
    kind: 'club',
    club: 'minimes',
    title: 'Minimes',
    subtitle: 'Informations du club',
    unread: 0,
    messages: [
      { id: 'c1', from: 'staff', signature: 'Boxing Center Minimes', text: 'Stage enfants de la Toussaint : cinq matinées de boxe éducative, du 19 au 23 octobre. Les places sont limitées, l’inscription se fait sur la boutique.', at: '2026-10-12T09:00:00' },
    ],
  },
];
