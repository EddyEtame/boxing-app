'use client';

import type { ClubId, Scheme } from '@bc/brand';
import { computeStats, type Passage } from '@bc/contract';
import { useMemo } from 'react';

import { IconChart, IconChat, IconGrid, IconPlanning, IconRing } from '@/components/icons';
import { Phone } from '@/components/phone/Phone';
import { useI18n } from '@/i18n/client';
import { auClub, CLUB_LABEL } from '@/lib/clubs';

/**
 * Les teintes de club de l'app (apps/mobile/src/screens/home/parts.tsx), reprises
 * à l'identique pour que l'aperçu soit l'app. Le validateur de palettes les
 * refuse (Minimes et Saint-Cyprien se confondent) : signalé, à corriger dans
 * l'app puis ici — idéalement en remontant cette table dans @bc/brand.
 */
const CLUB_HUE: Record<ClubId, string> = {
  minimes: '#2F6BFF',
  'saint-cyprien': '#8B5CF6',
  'etats-unis': '#10B981',
  ramonville: '#D946EF',
  portet: '#F97316',
};

/** « Mes stats » de l'app, dessiné avec les jetons de l'ambiance et calculé par computeStats. */
export function DemoPhone({ passages, nowIso, scheme, size = 'md', caption }: { passages: Passage[]; nowIso: string; scheme: Scheme; size?: 'md' | 'sm'; caption?: string }) {
  const { t, locale } = useI18n();
  const now = useMemo(() => new Date(nowIso), [nowIso]);
  const stats = useMemo(() => computeStats(passages, now, { goal: 3 }), [passages, now]);
  const month = new Intl.DateTimeFormat(locale === 'fr' ? 'fr-FR' : 'en-GB', { month: 'long' }).format(now);
  const actives = stats.activeWeeks;
  const progress = actives / stats.weeks.length;
  const r = 90;
  const c = 2 * Math.PI * r;
  const maxClub = Math.max(1, ...stats.byClub.map((x) => x.count));
  const maxWeek = Math.max(1, ...stats.weeks.map((w) => w.count));
  const top = stats.byClub[0]?.club ?? stats.byClubAll[0]?.club;
  const mostly = top ? (locale === 'fr' ? t('demo.app.mostly', { club: auClub(top) }) : t('demo.app.mostly', { club: CLUB_LABEL[top] })) : '';

  return (
    <Phone scheme={scheme} size={size} caption={caption}>
      <div className="app-scroll">
        <p className="app-title">{t('demo.app.title')}</p>
        <p className="app-sub" style={{ textTransform: 'capitalize' }}>
          {month} {now.getFullYear()}
        </p>
        <div className="app-card" style={{ paddingBottom: 4 }}>
          <div className="app-ring">
            <svg viewBox="0 0 196 196" aria-hidden="true">
              <circle cx="98" cy="98" r={r} fill="none" stroke="var(--chip)" strokeWidth="12" />
              <circle cx="98" cy="98" r={r} fill="none" stroke="var(--accent)" strokeWidth="12" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - progress)} transform="rotate(-90 98 98)" />
            </svg>
            <div className="app-ring-center">
              <b style={{ fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: 72, lineHeight: 0.9 }}>{stats.month}</b>
              <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-muted)' }}>{t('demo.app.sessionsIn', { n: stats.month, mois: month })}</span>
            </div>
          </div>
          <p className="app-ring-line">{t('demo.app.activeWeeks', { n: actives, total: stats.weeks.length })}</p>
          <p className="app-ring-sub">{mostly}</p>
        </div>
        <div className="app-kpis">
          <div>
            <b>{stats.total}</b>
            <span>{t('demo.app.total')}</span>
          </div>
          <div>
            <b>{stats.avgPerWeek.toLocaleString(locale === 'fr' ? 'fr-FR' : 'en-GB')}</b>
            <span>{t('demo.app.perWeek')}</span>
          </div>
          <div>
            <b>{stats.week}</b>
            <span>{t('demo.app.thisWeek')}</span>
          </div>
        </div>
        <p className="app-section">{t('demo.app.weeks')}</p>
        <div className="app-card app-weekbars">
          {stats.weeks.map((w) => (
            <i key={w.start} data-on={w.current} style={{ height: `${Math.max(4, (w.count / maxWeek) * 100)}%` }} />
          ))}
        </div>
        <p className="app-section">{t('demo.app.byClub')}</p>
        <div className="app-card">
          {stats.byClub.slice(0, 3).map((x) => (
            <div key={x.club} className="app-club">
              <i style={{ background: CLUB_HUE[x.club] }} />
              <div>
                <b>{CLUB_LABEL[x.club]}</b>
                <em style={{ '--w': `${Math.max(4, (x.count / maxClub) * 100)}%`, '--c': CLUB_HUE[x.club] } as React.CSSProperties} />
              </div>
              <strong>{x.count}</strong>
            </div>
          ))}
        </div>
      </div>
      <div className="app-tabbar" aria-hidden="true">
        {[
          { icon: IconRing, label: locale === 'fr' ? 'Accueil' : 'Home' },
          { icon: IconPlanning, label: 'Planning' },
          { icon: IconChart, label: 'Stats', on: true },
          { icon: IconChat, label: 'Messages' },
          { icon: IconGrid, label: locale === 'fr' ? 'Plus' : 'More' },
        ].map(({ icon: Icon, label, on }) => (
          <span key={label} data-on={on || undefined}>
            <Icon size={24} />
            {label}
          </span>
        ))}
      </div>
    </Phone>
  );
}
