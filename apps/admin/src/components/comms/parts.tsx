'use client';

import type { ComponentType, SVGProps } from 'react';

import { IconAlert, IconBag, IconCalendarPlus, IconChat, IconClock, IconPin, IconPlay, IconRing, IconTicket, IconUsers } from '@/components/icons';
import { useI18n } from '@/i18n/client';
import type { MessageKey, Translate } from '@/i18n/messages';
import { CLUB_LABEL } from '@/lib/clubs';
import { STATUTS, type AppLink, type Reach } from '@/lib/comms/types';
import type { ClubId, InboxThread, NotifType, PushNotification, Statut } from '@/lib/types';

/**
 * Les petites pièces partagées par Notifications et Messages : l'icône et
 * l'étiquette d'un type, l'étiquette d'un statut, le résumé d'une cible, la
 * jauge de portée. Une seule teinte d'accent : l'information est dans le mot,
 * jamais dans la couleur seule.
 */
type Icon = ComponentType<SVGProps<SVGSVGElement> & { size?: number }>;

const TYPE_ICON: Record<NotifType, Icon> = {
  direction: IconRing,
  coach: IconChat,
  evenement: IconTicket,
  promo: IconBag,
  video: IconPlay,
  club: IconPin,
  rappel: IconClock,
  rencontre: IconUsers,
  echeance: IconCalendarPlus,
  impaye: IconAlert,
};

export function TypeIcon({ type, size = 18 }: { type: NotifType; size?: number }) {
  const I = TYPE_ICON[type];
  return <I size={size} />;
}

export function TypeTag({ type }: { type: NotifType }) {
  const { t } = useI18n();
  return (
    <span className="tag comms-type">
      <TypeIcon type={type} size={14} />
      {t(`comms.type.${type}` as MessageKey)}
    </span>
  );
}

export function NotifStatusTag({ status }: { status: PushNotification['status'] }) {
  const { t } = useI18n();
  const cls = status === 'annulee' ? 'tag' : status === 'programmee' ? 'tag tag-ink' : 'tag tag-warn';
  return (
    <span className={cls}>
      <span className="dot" aria-hidden="true" />
      {t(`comms.status.${status}` as MessageKey)}
    </span>
  );
}

export function ThreadStatusTag({ status }: { status: InboxThread['status'] }) {
  const { t } = useI18n();
  const cls = status === 'nouveau' ? 'tag tag-neg' : status === 'en-cours' ? 'tag tag-warn' : 'tag tag-pos';
  return <span className={cls}>{t(`comms.thread.${status}` as MessageKey)}</span>;
}

/** « Minimes, Portet · Adhérents actifs » ; trois clubs et plus se comptent. */
export function targetLabel(t: Translate, clubs: ClubId[] | 'all', statuts: Statut[]): string {
  const c = clubs === 'all' ? t('club.all') : clubs.length <= 2 ? clubs.map((id) => CLUB_LABEL[id]).join(', ') : t('comms.target.clubsN', { n: clubs.length });
  const s = STATUTS.every((x) => statuts.includes(x)) ? t('comms.target.statutsAll') : STATUTS.filter((x) => statuts.includes(x)).map((x) => t(`statut.${x}` as MessageKey)).join(' + ');
  return `${c} · ${s}`;
}

export function linkLabel(t: Translate, link: AppLink | '' | undefined): string {
  if (!link) return t('comms.link.none');
  return t(link === '/' ? 'comms.link.home' : (`comms.link.${link.slice(1)}` as MessageKey));
}

/** La portée estimée, avec son honnêteté : mesurée, pas encore mesurée, ou personne. */
export function ReachMeter({ reach, loading }: { reach: Reach | null; loading: boolean }) {
  const { t } = useI18n();
  const zero = reach?.measured && reach.installs === 0;
  return (
    <div className="comms-reach" data-state={loading ? 'loading' : !reach ? 'idle' : !reach.measured ? 'unmeasured' : zero ? 'zero' : 'ok'} aria-live="polite">
      <span className="comms-reach-label">{t('comms.reach.label')}</span>
      <span className="comms-reach-value">{loading && !reach ? t('comms.reach.loading') : reach?.measured ? t('comms.reach.value', { n: reach.installs }) : '—'}</span>
      <span className="comms-reach-sub">{!reach ? '' : !reach.measured ? t('comms.reach.unmeasured') : zero ? t('comms.reach.zero') : t('comms.reach.sub')}</span>
    </div>
  );
}
