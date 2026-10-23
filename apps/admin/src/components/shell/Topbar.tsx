'use client';

import { Logo } from '@/components/Logo';
import { LangToggle, ThemeToggle } from '@/components/Toggles';
import { IconChevron, IconHelp, IconSearch } from '@/components/icons';
import { useBrowserValue, useNow } from '@/components/useNow';
import { useI18n } from '@/i18n/client';
import type { Section } from '@/lib/nav';

/** L'heure du club (Europe/Paris) : c'est elle qui compte pour programmer une notification ou un cours. */
function Clock() {
  const { t, locale } = useI18n();
  const now = useNow(1000);
  if (now === null) return <div className="clock" aria-hidden="true" />;
  const fmt = new Intl.DateTimeFormat(locale === 'fr' ? 'fr-FR' : 'en-GB', { timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  const parts = fmt.formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  return (
    <div className="clock" title={t('top.clock')}>
      <span className="clock-time">
        {get('hour')}:{get('minute')}
        <span className="clock-sec">:{get('second')}</span>
      </span>
      <span className="clock-place">Toulouse</span>
    </div>
  );
}

/** Sur « Aujourd'hui », le fil d'Ariane dit la date : le titre de la page dit déjà où l'on est. */
function Today() {
  const { locale } = useI18n();
  const now = useNow(60_000);
  if (now === null) return <strong />;
  // Une majuscule au début seulement : « Vendredi 23 octobre », jamais « Vendredi 23 Octobre ».
  const s = new Intl.DateTimeFormat(locale === 'fr' ? 'fr-FR' : 'en-GB', { timeZone: 'Europe/Paris', weekday: 'long', day: 'numeric', month: 'long' }).format(now);
  return <strong>{s.charAt(0).toUpperCase() + s.slice(1)}</strong>;
}

const onScroll = (cb: () => void) => {
  window.addEventListener('scroll', cb, { passive: true });
  return () => window.removeEventListener('scroll', cb);
};

export function Topbar({ section, onSearch, onHelp }: { section: Section; onSearch: () => void; onHelp: () => void }) {
  const { t } = useI18n();
  const scrolled = useBrowserValue(() => window.scrollY > 4, false, onScroll);
  const mac = useBrowserValue(() => /Mac|iPhone|iPad/.test(navigator.platform), false);

  return (
    <header className="topbar" data-scrolled={scrolled}>
      <div className="top-brand">
        <Logo width={92} />
      </div>
      <div className="crumbs">
        {section.group ? (
          <>
            <span>{t(`nav.group.${section.group}`)}</span>
            <IconChevron size={14} />
            <strong>{t(section.label)}</strong>
          </>
        ) : (
          <Today />
        )}
      </div>
      <button type="button" className="search-btn" onClick={onSearch} aria-label={t('top.search')} aria-keyshortcuts={mac ? 'Meta+K' : 'Control+K'}>
        <IconSearch size={18} />
        <span className="search-label">{t('top.search')}</span>
        <span className="kbd">{mac ? '⌘ K' : 'Ctrl K'}</span>
      </button>
      <div className="top-tools">
        <Clock />
        <ThemeToggle compact />
        <LangToggle />
        <button type="button" className="btn btn-ghost btn-icon" onClick={onHelp} aria-label={t('top.help')} title={`${t('top.help')} (?)`} data-tour="help" aria-keyshortcuts="?">
          <IconHelp size={20} />
        </button>
      </div>
    </header>
  );
}
