'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { IconMonitor, IconMoon, IconSun } from './icons';
import { applyLocale, applyTheme, readThemePref } from './prefs';
import { useBrowserValue } from './useNow';
import { useI18n } from '@/i18n/client';
import type { ThemePref } from '@/lib/theme-css';

/** Clair (le tapis), sombre (la salle) ou comme l'ordinateur — bascule immédiate, sans rechargement. */
export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { t } = useI18n();
  // La préférence vit dans un cookie : lue dans le navigateur, « système » au rendu serveur.
  const stored = useBrowserValue(readThemePref, 'system');
  const [chosen, setPref] = useState<ThemePref | null>(null);
  const pref = chosen ?? stored;
  const options: { id: ThemePref; icon: typeof IconSun; label: string }[] = [
    { id: 'light', icon: IconSun, label: `${t('theme.light')} · ${t('theme.lightSub')}` },
    { id: 'dark', icon: IconMoon, label: `${t('theme.dark')} · ${t('theme.darkSub')}` },
    { id: 'system', icon: IconMonitor, label: t('theme.system') },
  ];
  return (
    <div className={`seg${compact ? ' seg-icons' : ''}`} role="radiogroup" aria-label={t('theme.label')} data-tour="apparence">
      {options.map(({ id, icon: Icon, label }) => (
        <button
          key={id}
          type="button"
          role="radio"
          aria-checked={pref === id}
          aria-label={label}
          title={label}
          onClick={() => {
            setPref(id);
            applyTheme(id);
          }}
        >
          <Icon size={17} />
        </button>
      ))}
    </div>
  );
}

/** Français / English : le serveur relit la langue et la page revient traduite. */
export function LangToggle() {
  const { t, locale } = useI18n();
  const router = useRouter();
  const [pending, start] = useTransition();
  const next = locale === 'fr' ? 'en' : 'fr';
  return (
    <button
      type="button"
      className="btn btn-ghost btn-sm lang-btn"
      aria-label={`${t('lang.label')} : ${next === 'en' ? t('lang.en') : t('lang.fr')}`}
      title={`${t('lang.label')} : ${next === 'en' ? t('lang.en') : t('lang.fr')}`}
      disabled={pending}
      onClick={() => {
        applyLocale(next);
        start(() => router.refresh());
      }}
    >
      <span aria-hidden="true">{locale === 'fr' ? 'FR' : 'EN'}</span>
      <span aria-hidden="true" className="dim">
        /
      </span>
      <span aria-hidden="true" className="dim">
        {next.toUpperCase()}
      </span>
    </button>
  );
}
