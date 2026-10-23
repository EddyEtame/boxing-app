import { useCallback } from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { THREADS, type Message, type Thread } from '@/data/messages';
import { inLocale, useLocale } from '@/i18n';

import { useSession } from './session';
import { IS_SERVER, persistStorage } from './storage';

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
  reset: () => void;
};

let seq = 0;
function nextId(): string {
  seq += 1;
  return `local-${Date.now()}-${seq}`;
}

export const useMessages = create<MessagesState>()(
  persist(
    (set, get) => ({
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
  reset: () => set({ threads: THREADS }),
    }),
    // Les fils et ce que l'adhérent a écrit survivent à la fermeture de l'app (23/10/2026).
    {
      name: 'bc-messages',
      // v2 (23/10/2026) : messages de démonstration bilingues, prénom de l'adhérent au lieu de « Camille ».
      version: 2,
      storage: persistStorage,
      skipHydration: IS_SERVER,
      partialize: (s) => ({ threads: s.threads }),
      migrate: () => ({ threads: THREADS }),
    },
  ),
);

export function useUnreadCount(): number {
  return useMessages((s) => s.threads.reduce((n, th) => n + th.unread, 0));
}

/** Le texte d'un message dans la langue de l'app ; « {prenom} » devient le prénom de l'adhérent connecté. */
export function useMessageText(): (m: Message) => string {
  const locale = useLocale();
  const prenom = useSession((s) => s.member.prenom);
  return useCallback((m: Message) => inLocale(m, locale).text.replace(/\{prenom\}/g, prenom), [locale, prenom]);
}
