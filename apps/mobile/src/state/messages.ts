import { create } from 'zustand';

import { THREADS, type Message, type Thread } from '@/data/messages';

/**
 * Les fils de la messagerie (démo locale). En production : table
 * `messages_direction` et `staff_messages` côté serveur, notification push à
 * chaque réponse (.research/12 §5, CDC §10 et §14).
 */
type SendInput = {
  text: string;
  /** Sujet ou contexte joint, déjà traduit (« Problème d'accès », « À propos du message de Mehdi »). */
  label: string;
  /** Accusé de réception, déjà traduit : il dit qui répond et quand. */
  ack: string;
};

type MessagesState = {
  threads: Thread[];
  /** L'adhérent écrit à la direction : le seul canal libre (CDC §10). */
  send: (input: SendInput) => void;
  markRead: (id: string) => void;
};

let seq = 0;
function nextId(): string {
  seq += 1;
  return `local-${Date.now()}-${seq}`;
}

export const useMessages = create<MessagesState>((set, get) => ({
  threads: THREADS,
  send: ({ text, label, ack }) => {
    const mine: Message = { id: nextId(), from: 'member', text, at: new Date().toISOString(), context: label };
    set({ threads: get().threads.map((th) => (th.id === 'direction' ? { ...th, messages: [...th.messages, mine] } : th)) });
    // Apple Messages for Business : jamais de silence après un envoi.
    setTimeout(() => {
      const reply: Message = { id: nextId(), from: 'auto', text: ack, at: new Date().toISOString() };
      set({ threads: get().threads.map((th) => (th.id === 'direction' ? { ...th, messages: [...th.messages, reply] } : th)) });
    }, 1100);
  },
  markRead: (id) => set({ threads: get().threads.map((th) => (th.id === id ? { ...th, unread: 0 } : th)) }),
}));

export function useUnreadCount(): number {
  return useMessages((s) => s.threads.reduce((n, th) => n + th.unread, 0));
}
