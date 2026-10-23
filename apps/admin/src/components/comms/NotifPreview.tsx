'use client';

import type { Scheme } from '@bc/brand';
import type { CSSProperties, ReactNode } from 'react';

import { IconLock } from '@/components/icons';
import { Phone } from '@/components/phone/Phone';
import { useI18n } from '@/i18n/client';
import { photoUrl } from '@/lib/clubs';
import { fmtDate } from '@/lib/format';

/**
 * Les aperçus d'une notification, tels que l'adhérent les verra : l'écran
 * verrouillé d'un iPhone (photo du club en fond, carte de verre) et la bannière
 * d'Android par-dessus l'app. Le texte est coupé comme le système le coupe.
 */
const ICON = '/api/media/app/brand/logo-fond-blanc-600.png';

function NotifCard({ title, body, android }: { title: string; body: string; android?: boolean }) {
  const { t } = useI18n();
  return (
    <div className={android ? 'notif notif-android comms-notif' : 'notif comms-notif'}>
      <span className="notif-icon">
        {/* eslint-disable-next-line @next/next/no-img-element -- logo officiel, servi tel quel */}
        <img src={ICON} alt="" width={40} height={40} />
      </span>
      <div className="comms-notif-text">
        <div className="notif-head">
          <span>{t('comms.preview.app')}</span>
          <span>{t('comms.preview.now')}</span>
        </div>
        <div className={title ? 'notif-title comms-notif-title' : 'notif-title comms-notif-title comms-ph'}>{title || t('comms.preview.titlePh')}</div>
        <div className={body ? 'notif-body' : 'notif-body comms-ph'}>{body || t('comms.preview.bodyPh')}</div>
      </div>
    </div>
  );
}

export function LockPreview({ title, body, scheme = 'light', size = 'sm', caption, photo = 'ring-gants.jpg' }: { title: string; body: string; scheme?: Scheme; size?: 'sm' | 'md'; caption?: ReactNode; photo?: string }) {
  const { locale } = useI18n();
  // La date du jour ne sert qu'au décor : celle du rendu suffit (pas d'horloge qui tourne).
  const date = fmtDate(locale, new Date(), { weekday: 'long', day: 'numeric', month: 'long' });
  return (
    <Phone scheme={scheme} size={size} caption={caption}>
      <div className="lock comms-lock" style={{ '--lock-photo': `url(${photoUrl(photo)})` } as CSSProperties}>
        <div className="comms-lock-icon" aria-hidden="true">
          <IconLock size={22} />
        </div>
        <div className="lock-time">9:41</div>
        <div className="lock-date">{date.charAt(0).toUpperCase() + date.slice(1)}</div>
        <NotifCard title={title} body={body} />
      </div>
    </Phone>
  );
}

/** La bannière d'Android, par-dessus l'écran de l'app ouvert. */
export function BannerPreview({ title, body, scheme = 'dark', size = 'sm', caption, screen }: { title: string; body: string; scheme?: Scheme; size?: 'sm' | 'md'; caption?: ReactNode; screen: string }) {
  return (
    <Phone scheme={scheme} size={size} caption={caption}>
      <div className="app-scroll comms-banner-app">
        <div className="comms-banner">
          <NotifCard title={title} body={body} android />
        </div>
        <p className="app-title">{screen}</p>
        <div className="comms-ghost" style={{ height: 150 }} />
        <div className="comms-ghost" style={{ height: 86 }} />
        <div className="comms-ghost" style={{ height: 86 }} />
      </div>
    </Phone>
  );
}

/** La carte du message dans l'onglet Messages de l'app : signée, en lecture seule. */
export function MessageCardPreview({ signature, text, scheme = 'light', size = 'sm', caption, readOnly }: { signature: string; text: string; scheme?: Scheme; size?: 'sm' | 'md'; caption?: ReactNode; readOnly: string }) {
  const { t } = useI18n();
  return (
    <Phone scheme={scheme} size={size} caption={caption}>
      <div className="app-scroll">
        <p className="app-title">{t('nav.messages')}</p>
        <div className="app-card comms-app-thread">
          <div className="app-bubble">
            <small>{signature}</small>
            <span className={text ? 'comms-pre' : 'comms-pre comms-ph'}>{text || t('comms.preview.bodyPh')}</span>
          </div>
          <p className="comms-app-readonly">
            <IconLock size={15} />
            {readOnly}
          </p>
        </div>
      </div>
    </Phone>
  );
}
