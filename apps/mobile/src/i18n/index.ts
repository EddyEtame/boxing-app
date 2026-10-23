import { getLocales } from 'expo-localization';
import { useCallback } from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { IS_SERVER, persistStorage } from '@/state/storage';

import { en } from './en';
import { fr } from './fr';
import type { Path, Translation } from './types';

export type Locale = 'fr' | 'en';
export type MessageKey = Path<typeof fr>;
type Params = Record<string, string | number>;

/** Le français fait foi ; l'anglais doit avoir exactement les mêmes clés (vérifié par le typage). */
const dictionaries: Record<Locale, Translation> = { fr, en };

function detectLocale(): Locale {
  try {
    const code = getLocales()[0]?.languageCode ?? 'fr';
    return code === 'en' ? 'en' : 'fr';
  } catch {
    return 'fr';
  }
}

type I18nState = {
  locale: Locale;
  hydrated: boolean;
  setLocale: (l: Locale) => void;
};

/** La langue choisie survit à la fermeture de l'app ; par défaut, celle du téléphone. */
export const useI18nStore = create<I18nState>()(
  persist(
    (set) => ({
      locale: detectLocale(),
      hydrated: false,
      setLocale: (locale) => set({ locale }),
    }),
    {
      name: 'bc-locale',
      version: 1,
      storage: persistStorage,
      skipHydration: IS_SERVER,
      partialize: (s) => ({ locale: s.locale }),
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<I18nState>;
        return { ...current, locale: p.locale === 'en' || p.locale === 'fr' ? p.locale : current.locale };
      },
      onRehydrateStorage: () => () => {
        useI18nStore.setState({ hydrated: true });
      },
    },
  ),
);

function lookup(dict: Translation, key: string): string {
  const value = key.split('.').reduce<unknown>((acc, part) => (acc && typeof acc === 'object' ? (acc as Record<string, unknown>)[part] : undefined), dict);
  return typeof value === 'string' ? value : key;
}

/**
 * Interpole `{nom}` et accorde `{n:séance|séances}`.
 * Le français garde le singulier pour 0 et 1 (« 0 séance »), l'anglais seulement pour 1.
 */
function format(template: string, params: Params | undefined, locale: Locale): string {
  if (!params) return template;
  return template.replace(/\{(\w+)(?::([^|}]*)\|([^}]*))?\}/g, (whole: string, k: string, one?: string, many?: string) => {
    const v = params[k];
    if (v === undefined) return whole;
    if (one === undefined || many === undefined) return String(v);
    const n = Math.abs(typeof v === 'number' ? v : Number(v));
    const singular = locale === 'fr' ? n < 2 : n === 1;
    return singular ? one : many;
  });
}

export function useLocale(): Locale {
  return useI18nStore((s) => s.locale);
}

export function useT() {
  const locale = useI18nStore((s) => s.locale);
  const dict = dictionaries[locale];
  return (key: MessageKey, params?: Params) => format(lookup(dict, key), params, locale);
}

export function t(key: MessageKey, params?: Params) {
  const locale = useI18nStore.getState().locale;
  return format(lookup(dictionaries[locale], key), params, locale);
}

/**
 * Les données de l'app sont écrites en français, avec leur version anglaise à
 * côté (`en`, exigée par le typage de chaque fichier de data/) : en anglais,
 * les champs traduits remplacent les champs français. Le contenu écrit par une
 * personne (un message d'adhérent, une proposition de séance) reste dans sa langue.
 */
export function inLocale<T extends { en?: object }>(item: T, locale: Locale): T {
  return locale === 'en' && item.en ? { ...item, ...item.en } : item;
}

export function useInLocale(): <T extends { en?: object }>(item: T) => T {
  const locale = useI18nStore((s) => s.locale);
  return useCallback(<T extends { en?: object }>(item: T) => inLocale(item, locale), [locale]);
}
