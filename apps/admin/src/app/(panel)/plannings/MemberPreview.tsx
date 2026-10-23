'use client';

import { PosterGrid } from './PosterGrid';
import { Phone } from '@/components/phone/Phone';
import { useI18n } from '@/i18n/client';
import type { MessageKey } from '@/i18n/messages';
import { CLUB_LABEL, CLUB_PHOTO, photoThumb } from '@/lib/clubs';
import { familleColor, heure, isFree, normaliseActivite, slotsFor } from '@/lib/planning/model';
import type { ClubId, Slot, SlotException } from '@/lib/types';

/**
 * « VOIR COMME L'ADHÉRENT » — l'écran Planning de l'app, en vrai : la semaine en
 * affiche (téléphone clair) et la journée en liste (téléphone sombre), avec les
 * mots de l'app et sa règle de couleur. Aucun nom de coach : il ne sort jamais
 * de l'admin. Une séance annulée apparaît barrée : c'est ce que l'API publie
 * (`cancellations`) et ce que l'app devra afficher — elle ne le fait pas encore.
 */
export function MemberPreview({ slots, club, espace, jour, date, exceptions, nowMin, todayJour, weekDates }: { slots: Slot[]; club: ClubId; espace?: string; jour: number; date: string; exceptions: SlotException[]; nowMin: number | null; todayJour: number | null; weekDates: string[] }) {
  const { t } = useI18n();
  const list = slotsFor(slots, club, jour, espace);
  const cancelled = new Set(exceptions.filter((e) => e.date === date).map((e) => e.slotId));
  const live = todayJour === jour ? nowMin : null;

  return (
    <div className="member-preview">
      <div className="phones">
        <Phone scheme="light" caption={t('planning.member.week')}>
          <div className="app-scroll mp-scroll">
            <AppHead club={club} mode="semaine" />
            <div className="mp-poster">
              <PosterGrid slots={slots} club={club} espace={espace} variant="member" compact todayJour={todayJour} nowMin={nowMin} weekDates={weekDates} exceptions={exceptions} />
            </div>
            <p className="mp-hint">{t('planning.member.swipe')}</p>
          </div>
        </Phone>
        <Phone scheme="dark" caption={t('planning.member.day', { day: t(`day.${jour}` as MessageKey) })}>
          <div className="app-scroll mp-scroll">
            <AppHead club={club} mode="jour" />
            <div className="mp-days" aria-hidden="true">
              {[0, 1, 2, 3, 4, 5, 6].map((j) => (
                <span key={j} className="mp-day" data-on={j === jour || undefined}>
                  {t(`planning.dayShort.${j}` as MessageKey)}
                </span>
              ))}
            </div>
            <div className="mp-list">
              {list.length === 0 ? <p className="mp-empty">{t('planning.member.empty')}</p> : null}
              {list.map((s) => {
                const a = normaliseActivite(s.activite);
                const libre = isFree(s);
                const off = cancelled.has(s.id);
                const enCours = live !== null && live >= s.debut && live < s.fin;
                const meta = [a.public, a.niveau, s.espace].filter(Boolean).join(' · ');
                return (
                  <div key={s.id} className="mp-row" data-free={libre || undefined} data-off={off || undefined}>
                    <div className="mp-time">
                      <b>{heure(s.debut)}</b>
                      <span>{heure(s.fin)}</span>
                    </div>
                    <span className="mp-bar" style={{ background: libre ? 'var(--line-strong)' : enCours ? 'var(--accent)' : familleColor(a.famille) }} />
                    <div className="mp-body">
                      <b>{a.libelle}</b>
                      {meta ? <span>{meta}</span> : null}
                      {off ? <em>{t('planning.member.cancelled')}</em> : null}
                    </div>
                    <span className="mp-right">{enCours ? t('planning.member.live') : `${s.fin - s.debut} min`}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </Phone>
      </div>
      <p className="field-help mp-note">{t('planning.member.note')}</p>
    </div>
  );
}

function AppHead({ club, mode }: { club: ClubId; mode: 'jour' | 'semaine' }) {
  const { t } = useI18n();
  return (
    <div className="mp-head">
      <p className="mp-title">{t('planning.member.title')}</p>
      <div className="mp-plate" style={{ backgroundImage: `linear-gradient(180deg, rgba(8,8,8,0) 30%, rgba(8,8,8,0.72)), url(${photoThumb(CLUB_PHOTO[club], 384)})` }}>
        <b>{CLUB_LABEL[club]}</b>
      </div>
      <div className="mp-seg" aria-hidden="true">
        <span data-on={mode === 'jour' || undefined}>{t('planning.member.modeDay')}</span>
        <span data-on={mode === 'semaine' || undefined}>{t('planning.member.modeWeek')}</span>
      </div>
    </div>
  );
}
