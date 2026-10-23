'use client';

import { useSyncExternalStore } from 'react';

const noop = () => () => {};

/**
 * Une valeur qui n'existe que dans le navigateur (l'heure, la position du
 * défilement, le système), lue sans setState dans un effet : `server` au rendu
 * serveur et pendant l'hydratation — identique des deux côtés, donc pas
 * d'erreur d'hydratation —, puis la vraie valeur. `read` doit renvoyer une
 * valeur stable tant que rien n'a changé (un nombre, une chaîne, un booléen).
 */
export function useBrowserValue<T>(read: () => T, server: T, subscribe: (onChange: () => void) => () => void = noop): T {
  return useSyncExternalStore(subscribe, read, () => server);
}

const intervals = new Map<number, (onChange: () => void) => () => void>();
function every(ms: number) {
  let sub = intervals.get(ms);
  if (!sub) {
    sub = (onChange) => {
      const id = window.setInterval(onChange, ms);
      return () => window.clearInterval(id);
    };
    intervals.set(ms, sub);
  }
  return sub;
}

/**
 * « Maintenant », mais seulement dans le navigateur : `null` au rendu serveur et
 * à l'hydratation (on affiche alors une date absolue), puis l'heure réelle,
 * arrondie au pas demandé et rafraîchie à ce pas.
 */
export function useNow(everyMs = 30_000): number | null {
  return useBrowserValue<number | null>(() => Math.floor(Date.now() / everyMs) * everyMs, null, every(everyMs));
}
