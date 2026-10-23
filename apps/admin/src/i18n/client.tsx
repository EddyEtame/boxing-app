'use client';

import { createContext, use, useMemo, type ReactNode } from 'react';

import type { Locale } from './core';
import { translator, type Messages, type Translate } from './messages';

type I18n = { locale: Locale; messages: Messages };

const I18nContext = createContext<I18n | null>(null);

export function I18nProvider({ locale, messages, children }: I18n & { children: ReactNode }) {
  const value = useMemo(() => ({ locale, messages }), [locale, messages]);
  return <I18nContext value={value}>{children}</I18nContext>;
}

export function useI18n(): { t: Translate; locale: Locale; messages: Messages } {
  const ctx = use(I18nContext);
  if (!ctx) throw new Error('useI18n hors de I18nProvider');
  const { locale, messages } = ctx;
  const t = useMemo(() => translator(locale, messages), [locale, messages]);
  return { t, locale, messages };
}

export function useT(): Translate {
  return useI18n().t;
}
