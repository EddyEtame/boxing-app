'use client';

import { discipline, type Scheme } from '@bc/brand';
import { useEffect, useState, type ReactNode } from 'react';

import { IconAlert, IconChat, IconChevron, IconGrid, IconLock, IconPlanning, IconPlay, IconRing, IconTicket } from '@/components/icons';
import { Phone } from '@/components/phone/Phone';
import { Segmented } from '@/components/wizard/fields';
import { useI18n } from '@/i18n/client';
import type { MessageKey } from '@/i18n/messages';
import { CLUB_LABEL } from '@/lib/clubs';
import { fmtWall } from '@/lib/content/rules';
import { thumbUrl } from '@/lib/content/media';
import type { ClubId, EventKind, Famille, Media, NewsKind, Niveau, Objectif, Securite } from '@/lib/types';

/**
 * L'APERÇU DANS L'APP : les écrans Actualités et S'entraîner tels que l'app
 * les dessine (apps/mobile/src/screens/actualites.tsx, home/parts.tsx,
 * entrainer.tsx), avec les jetons de son ambiance. L'admin vouvoie ; l'app
 * tutoie : les textes de l'écran sont ceux de l'app.
 */

export function PreviewPane({ children }: { children: (scheme: Scheme) => ReactNode }) {
  const { t } = useI18n();
  const [scheme, setScheme] = useState<Scheme>('light');
  return (
    <div className="stack" style={{ '--gap': '14px' } as React.CSSProperties}>
      <Segmented
        label={t('contenu.preview.scheme')}
        value={scheme}
        onChange={setScheme}
        options={[
          { value: 'light', label: t('theme.light') },
          { value: 'dark', label: t('theme.dark') },
        ]}
      />
      <div className="phones">{children(scheme)}</div>
    </div>
  );
}

function TabBar({ on }: { on: 'plus' | 'train' }) {
  const { locale } = useI18n();
  const fr = locale === 'fr';
  const tabs = [
    { key: 'home', icon: IconRing, label: fr ? 'Accueil' : 'Home' },
    { key: 'planning', icon: IconPlanning, label: fr ? 'Planning' : 'Schedule' },
    { key: 'train', icon: IconPlay, label: fr ? 'Entraîner' : 'Train' },
    { key: 'messages', icon: IconChat, label: 'Messages' },
    { key: 'plus', icon: IconGrid, label: fr ? 'Plus' : 'More' },
  ];
  return (
    <div className="app-tabbar" aria-hidden="true">
      {tabs.map(({ key, icon: Icon, label }) => (
        <span key={key} data-on={key === on || undefined}>
          <Icon size={24} />
          {label}
        </span>
      ))}
    </div>
  );
}

/**
 * Le titre de la grande carte est coupé à deux lignes dans l'app (numberOfLines
 * = 2) : on mesure l'aperçu, et on le dit avant que l'adhérent ne lise « GALA D'AU… ».
 */
function useClamped(): [(el: HTMLElement | null) => void, boolean] {
  const [el, setEl] = useState<HTMLElement | null>(null);
  const [clamped, setClamped] = useState(false);
  useEffect(() => {
    if (!el) return;
    // Une ligne de plus que les deux permises, pas les quelques pixels qui dépassent des lettres (interligne 0,9).
    const check = () => setClamped(el.scrollHeight > el.clientHeight * 1.25);
    const frame = requestAnimationFrame(check);
    const mo = new MutationObserver(check);
    mo.observe(el, { characterData: true, childList: true, subtree: true });
    const ro = new ResizeObserver(check);
    ro.observe(el);
    void document.fonts?.ready.then(check);
    return () => {
      cancelAnimationFrame(frame);
      mo.disconnect();
      ro.disconnect();
    };
  }, [el]);
  return [setEl, clamped];
}

function Caption({ scheme }: { scheme: Scheme }) {
  const { t } = useI18n();
  return <span>{`${t(scheme === 'light' ? 'theme.light' : 'theme.dark')} · ${t(scheme === 'light' ? 'theme.lightSub' : 'theme.darkSub')}`}</span>;
}

/** Le téléphone, et au-dessus l'alerte quand le titre ne tiendra pas sur la carte de l'app. */
function WithWarning({ clamped, children }: { clamped: boolean; children: ReactNode }) {
  const { t } = useI18n();
  return (
    <div className="ct-phone-stack">
      {clamped ? (
        <p className="ct-cap-warn" role="status">
          <IconAlert size={14} />
          {t('contenu.preview.clamped')}
        </p>
      ) : null}
      {children}
    </div>
  );
}

/** Le bas de carte de l'app : un trait de couleur, un texte en capitales mono. */
function LowerThird({ meta, bar }: { meta: string; bar?: string }) {
  return (
    <div className="ct-lower">
      <span className="ct-lower-bar" style={bar ? { background: bar } : undefined} />
      <span className="ct-lower-meta">{meta}</span>
    </div>
  );
}

const shortDay = (locale: 'fr' | 'en', ymd: string) => fmtWall(locale, ymd.slice(0, 10), { day: 'numeric', month: 'short' }).replace('.', '');

/** Les deux premières phrases d'un texte, comme sous le titre de l'app. */
const lead = (s: string) => s.replace(/\s+/g, ' ').trim();

/* ------------------------------------------------------------------ */
/* Actualités                                                           */
/* ------------------------------------------------------------------ */

export type NewsLike = { kind: NewsKind | null; title: string; body: string; date: string; club: ClubId | null; photo: Media | null; link?: { url: string; label: string } | null };

export function NewsPhone({ scheme, item, others, size = 'md' }: { scheme: Scheme; item: NewsLike; others: NewsLike[]; size?: 'md' | 'sm' }) {
  const { t, locale } = useI18n();
  const kind = item.kind ? t(`actu.kind.${item.kind}` as MessageKey) : '';
  const title = item.title.trim() || t('contenu.preview.placeholderTitle');
  const body = lead(item.body) || t('contenu.preview.placeholderBody');
  const [titleRef, clamped] = useClamped();
  return (
    <WithWarning clamped={clamped && Boolean(item.title.trim())}>
      <Phone scheme={scheme} size={size} caption={<Caption scheme={scheme} />}>
        <div className="app-scroll">
          <h1 className="app-title">{t('actu.preview.screenTitle')}</h1>
          <p className="app-sub">{t('actu.preview.screenSub')}</p>
          <article className="ct-poster">
            {item.photo ? (
              // eslint-disable-next-line @next/next/no-img-element -- photothèque locale
              <img src={thumbUrl(item.photo, 640)} alt="" />
            ) : (
              <span className="ct-poster-empty" />
            )}
            <div className="ct-corners">
              <span>{kind}</span>
              <span className="ct-corner-dim">{item.date ? shortDay(locale, item.date) : ''}</span>
            </div>
            <div className="ct-poster-bottom">
              <h2 ref={titleRef} className="ct-poster-title">
                {title}
              </h2>
              <p className="ct-poster-sub">{body}</p>
              <LowerThird meta={[kind, item.club ? CLUB_LABEL[item.club] : null].filter(Boolean).map((x) => String(x).toUpperCase()).join(' · ')} />
            </div>
          </article>
          {item.link?.url ? (
            <span className="ct-app-link">
              {item.link.label || '…'}
              <IconChevron size={16} />
            </span>
          ) : null}
          {others.length ? (
            <>
              <p className="app-section">{t('actu.preview.more')}</p>
              <div className="app-card ct-rows">
                {others.slice(0, 3).map((o, i) => (
                  <div key={i} className="ct-row">
                    {o.photo ? (
                      // eslint-disable-next-line @next/next/no-img-element -- photothèque locale
                      <img src={thumbUrl(o.photo, 256)} alt="" className="ct-thumb" />
                    ) : (
                      <span className="ct-thumb" />
                    )}
                    <div className="ct-row-body">
                      <b>{o.title}</b>
                      <span>{lead(o.body)}</span>
                      <em>{shortDay(locale, o.date)}</em>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : null}
        </div>
        <TabBar on="plus" />
      </Phone>
    </WithWarning>
  );
}

/* ------------------------------------------------------------------ */
/* Événements                                                           */
/* ------------------------------------------------------------------ */

export type EventLike = {
  kind: EventKind | null;
  title: string;
  body: string;
  startsAt: string;
  endsAt?: string | null;
  club: ClubId | null;
  venue?: string | null;
  photo: Media | null;
  ticketUrl?: string | null;
  fight?: { fighter: string; opponent: string; weightClass?: string | null; title?: string | null; broadcaster?: string | null } | null;
};

export function EventPhone({ scheme, item, size = 'md' }: { scheme: Scheme; item: EventLike; size?: 'md' | 'sm' }) {
  const { t, locale } = useI18n();
  const kind = item.kind ? t(`evt.kind.${item.kind}` as MessageKey) : '';
  const title = item.title.trim() || t('contenu.preview.placeholderTitle');
  const valid = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(item.startsAt);
  const day = valid ? fmtWall(locale, item.startsAt, { day: 'numeric' }) : '—';
  const month = valid ? fmtWall(locale, item.startsAt, { month: 'short' }).replace('.', '') : '';
  const weekday = valid ? fmtWall(locale, item.startsAt, { weekday: 'long' }) : '';
  const time = valid ? item.startsAt.slice(11).replace(':', 'h').replace(/h00$/, 'h') : '';
  const place = item.club ? CLUB_LABEL[item.club] : (item.venue ?? '').trim();
  const f = item.fight;
  const [titleRef, clamped] = useClamped();
  return (
    <WithWarning clamped={clamped && Boolean(item.title.trim())}>
      <Phone scheme={scheme} size={size} caption={<Caption scheme={scheme} />}>
        <div className="app-scroll">
          <h1 className="app-title">{t('evt.preview.screenTitle')}</h1>
          <p className="app-sub">{t('actu.preview.screenSub')}</p>
          <article className="ct-poster ct-poster-event">
            {item.photo ? (
              // eslint-disable-next-line @next/next/no-img-element -- photothèque locale
              <img src={thumbUrl(item.photo, 640)} alt="" />
            ) : (
              <span className="ct-poster-empty" />
            )}
            <div className="ct-corners">
              <span>{kind}</span>
              <span className="ct-date">
                <b>{day}</b>
                <i>{month}</i>
              </span>
            </div>
            <div className="ct-poster-bottom">
              {f && (f.fighter.trim() || f.opponent.trim()) ? (
                <div className="ct-fight">
                  <b>{f.fighter.trim() || '…'}</b>
                  <span>{locale === 'fr' ? 'contre' : 'vs'}</span>
                  <b>{f.opponent.trim() || '…'}</b>
                </div>
              ) : null}
              <h2 ref={titleRef} className="ct-poster-title">
                {title}
              </h2>
              <p className="ct-poster-sub">{[weekday, time, place].filter(Boolean).join(' · ')}</p>
              <LowerThird meta={[kind, f?.weightClass, f?.title, f?.broadcaster].filter((x) => x && String(x).trim()).map((x) => String(x).toUpperCase()).join(' · ')} />
            </div>
          </article>
          {item.ticketUrl ? (
            <span className="ct-app-btn">
              <IconTicket size={18} />
              {t('evt.preview.ticket')}
            </span>
          ) : null}
          {item.body.trim() ? <p className="ct-app-body">{lead(item.body)}</p> : null}
        </div>
        <TabBar on="plus" />
      </Phone>
    </WithWarning>
  );
}

/* ------------------------------------------------------------------ */
/* Vidéos                                                               */
/* ------------------------------------------------------------------ */

export type VideoLike = { title: string; famille: Exclude<Famille, 'accesLibre'> | null; niveau: Niveau; dureeMin: number; objectif: Objectif | null; securite: Securite | null; gratuite: boolean; poster: Media | null };

const NIVEAU_KEY: Record<Niveau, MessageKey> = { Débutant: 'vid.niveau.debutant', Intermédiaire: 'vid.niveau.intermediaire', Confirmé: 'vid.niveau.confirme' };
const OBJ_KEY: Record<Objectif, MessageKey> = { Technique: 'vid.obj.technique', Cardio: 'vid.obj.cardio', Condition: 'vid.obj.condition', Mobilité: 'vid.obj.mobilite', Renforcement: 'vid.obj.renforcement', Sparring: 'vid.obj.sparring' };
export const niveauKey = (n: Niveau) => NIVEAU_KEY[n];
export const objectifKey = (o: Objectif) => OBJ_KEY[o];

export function VideoPhone({ scheme, item, count, size = 'md' }: { scheme: Scheme; item: VideoLike; count: number; size?: 'md' | 'sm' }) {
  const { t } = useI18n();
  const famille = item.famille ? t(`vid.famille.${item.famille}` as MessageKey).split(' · ')[0]! : '—';
  const meta = [famille, t(NIVEAU_KEY[item.niveau]), item.objectif ? t(OBJ_KEY[item.objectif]) : null, item.securite && item.securite !== 'seul' ? t(`vid.sec.${item.securite}` as MessageKey) : null]
    .filter(Boolean)
    .map((s) => String(s).toUpperCase())
    .join(' · ');
  const bar = item.securite === 'seul' && item.famille ? discipline[item.famille] : undefined;
  return (
    <Phone scheme={scheme} size={size} caption={<Caption scheme={scheme} />}>
      <div className="app-scroll">
        <h1 className="app-title">{t('vid.preview.screenTitle')}</h1>
        <p className="app-sub">{t('vid.preview.screenSub')}</p>
        <p className="ct-app-count">{t('vid.sum.total', { n: count })}</p>
        <article className="ct-video">
          <div className="ct-video-photo" data-locked={!item.gratuite || undefined}>
            {item.poster ? (
              // eslint-disable-next-line @next/next/no-img-element -- photothèque locale
              <img src={thumbUrl(item.poster, 640)} alt="" />
            ) : (
              <span className="ct-poster-empty" />
            )}
            <div className="ct-video-top">
              <span className="ct-badge">{t('vid.minutes', { n: Number.isFinite(item.dureeMin) ? item.dureeMin : 0 })}</span>
              {!item.gratuite ? (
                <span className="ct-badge" aria-label={t('vid.preview.locked')}>
                  <IconLock size={14} />
                </span>
              ) : null}
            </div>
            <div className="ct-video-bottom">
              <h2>{item.title.trim() || t('contenu.preview.placeholderTitle')}</h2>
              <span className="ct-play">
                <IconPlay size={22} />
              </span>
            </div>
          </div>
          <LowerThird meta={meta} bar={bar} />
        </article>
      </div>
      <TabBar on="train" />
    </Phone>
  );
}
