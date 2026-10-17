import { getLocales } from 'expo-localization';
import { create } from 'zustand';

import { en } from './en';
import { fr } from './fr';

export type Locale = 'fr' | 'en';
export type Dictionary = typeof fr;

const dictionaries: Record<Locale, Dictionary> = { fr, en: en as unknown as Dictionary };

function detectLocale(): Locale {
  const code = getLocales()[0]?.languageCode ?? 'fr';
  return code === 'en' ? 'en' : 'fr';
}

type I18nState = {
  locale: Locale;
  setLocale: (l: Locale) => void;
};

export const useI18nStore = create<I18nState>((set) => ({
  locale: detectLocale(),
  setLocale: (locale) => set({ locale }),
}));

type Path<T, P extends string = ''> = {
  [K in keyof T & string]: T[K] extends string ? `${P}${K}` : Path<T[K], `${P}${K}.`>;
}[keyof T & string];

export type MessageKey = Path<Dictionary>;

function lookup(dict: Dictionary, key: string): string {
  const value = key.split('.').reduce<unknown>((acc, part) => (acc && typeof acc === 'object' ? (acc as Record<string, unknown>)[part] : undefined), dict);
  return typeof value === 'string' ? value : key;
}

/** Interpole {nom} dans la chaîne. */
function format(template: string, params?: Record<string, string | number>): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_, k: string) => String(params[k] ?? `{${k}}`));
}

export function useT() {
  const locale = useI18nStore((s) => s.locale);
  const dict = dictionaries[locale];
  return (key: MessageKey, params?: Record<string, string | number>) => format(lookup(dict, key), params);
}

export function t(key: MessageKey, params?: Record<string, string | number>) {
  const dict = dictionaries[useI18nStore.getState().locale];
  return format(lookup(dict, key), params);
}
