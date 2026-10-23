'use client';

import { LOCALE_COOKIE, type Locale } from '@/i18n/core';
import { THEME_COOKIE, type ThemePref } from '@/lib/theme-css';

/**
 * Les préférences de la personne (ambiance, langue) : de simples cookies
 * lisibles par le serveur, pour que la page arrive déjà dans le bon thème et
 * la bonne langue. Rien de sensible.
 */
const YEAR = 60 * 60 * 24 * 365;

function setCookie(name: string, value: string) {
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${YEAR}; samesite=lax`;
}

/** Change d'ambiance tout de suite ; un fondu croisé si le navigateur sait le faire. */
export function applyTheme(pref: ThemePref) {
  setCookie(THEME_COOKIE, pref);
  const swap = () => document.documentElement.setAttribute('data-theme', pref);
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const doc = document as Document & { startViewTransition?: (cb: () => void) => unknown };
  if (!reduce && typeof doc.startViewTransition === 'function') doc.startViewTransition(swap);
  else swap();
}

export function applyLocale(locale: Locale) {
  setCookie(LOCALE_COOKIE, locale);
  document.documentElement.setAttribute('lang', locale);
}

export function readThemePref(): ThemePref {
  const v = document.documentElement.getAttribute('data-theme');
  return v === 'light' || v === 'dark' ? v : 'system';
}
