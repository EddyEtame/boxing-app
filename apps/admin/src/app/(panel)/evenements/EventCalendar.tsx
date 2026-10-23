'use client';

import { useMemo } from 'react';

import { IconChevron, IconPlus } from '@/components/icons';
import { useNow } from '@/components/useNow';
import { useI18n } from '@/i18n/client';
import type { MessageKey } from '@/i18n/messages';
import { fmtWall, todayParis } from '@/lib/content/rules';
import type { ClubEvent } from '@/lib/types';

/**
 * Le mois en un coup d'œil : chaque événement sur ses jours (un stage de
 * cinq matinées s'étale sur cinq cases), trois par jour au plus, le reste
 * derrière « +n ». Sur téléphone, le mois devient un agenda.
 */
const MAX_PER_DAY = 3;

function addDays(ymd: string, n: number): string {
  const [y, m, d] = ymd.split('-').map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

/** Les 42 jours (6 semaines, lundi d'abord) qui couvrent le mois `ym` (« 2026-10 »). */
function monthCells(ym: string): string[] {
  const first = `${ym}-01`;
  const [y, m] = ym.split('-').map(Number) as [number, number];
  const dow = (new Date(Date.UTC(y, m - 1, 1)).getUTCDay() + 6) % 7;
  const start = addDays(first, -dow);
  return Array.from({ length: 42 }, (_, i) => addDays(start, i));
}

export function shiftMonth(ym: string, n: number): string {
  const [y, m] = ym.split('-').map(Number) as [number, number];
  return new Date(Date.UTC(y, m - 1 + n, 1)).toISOString().slice(0, 7);
}

export function EventCalendar({ events, month, onMonth, onOpen, onCreate, canCreate, onDay }: { events: ClubEvent[]; month: string; onMonth: (ym: string) => void; onOpen: (e: ClubEvent) => void; onCreate: (ymd: string) => void; canCreate: boolean; onDay: (ymd: string) => void }) {
  const { t, locale } = useI18n();
  const now = useNow();
  const today = now === null ? null : todayParis(new Date(now));
  const cells = useMemo(() => monthCells(month), [month]);

  const byDay = useMemo(() => {
    const map = new Map<string, ClubEvent[]>();
    for (const e of events) {
      const from = e.startsAt.slice(0, 10);
      const to = (e.endsAt ?? e.startsAt).slice(0, 10);
      let day = from;
      for (let i = 0; i < 40 && day <= to; i++) {
        map.set(day, [...(map.get(day) ?? []), e]);
        day = addDays(day, 1);
      }
    }
    for (const list of map.values()) list.sort((a, b) => a.startsAt.localeCompare(b.startsAt));
    return map;
  }, [events]);

  const monthLabel = fmtWall(locale, `${month}-01`, { month: 'long', year: 'numeric' });
  const dows = Array.from({ length: 7 }, (_, i) => fmtWall(locale, addDays('2026-10-19', i), { weekday: 'short' }).replace('.', ''));
  const inMonth = (ymd: string) => ymd.slice(0, 7) === month;
  const agendaDays = cells.filter((d) => inMonth(d) && (byDay.get(d)?.length || d === today));

  const chip = (e: ClubEvent, day: string) => {
    const starts = e.startsAt.slice(0, 10) === day;
    return (
      <button key={`${e.id}-${day}`} type="button" className="ct-cal-ev" data-status={e.status} onClick={() => onOpen(e)} title={e.title}>
        <b>{e.title}</b>
        <span>
          {starts ? e.startsAt.slice(11) : '↳'} · {t(`evt.kind.${e.kind}` as MessageKey)}
        </span>
      </button>
    );
  };

  return (
    <div>
      <div className="ct-cal-head">
        <h3 className="ct-cal-title" aria-live="polite">
          {monthLabel}
        </h3>
        <button type="button" className="btn btn-secondary btn-sm btn-icon" onClick={() => onMonth(shiftMonth(month, -1))} aria-label={t('evt.cal.prev')}>
          <IconChevron size={18} style={{ transform: 'rotate(180deg)' }} />
        </button>
        <button type="button" className="btn btn-secondary btn-sm btn-icon" onClick={() => onMonth(shiftMonth(month, 1))} aria-label={t('evt.cal.next')}>
          <IconChevron size={18} />
        </button>
        {today && today.slice(0, 7) !== month ? (
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => onMonth(today.slice(0, 7))}>
            {t('evt.cal.today')}
          </button>
        ) : null}
      </div>

      <div className="ct-cal" role="grid" aria-label={monthLabel}>
        {dows.map((d) => (
          <div key={d} className="ct-cal-dow" role="columnheader">
            {d}
          </div>
        ))}
        {cells.map((day) => {
          const list = byDay.get(day) ?? [];
          const label = fmtWall(locale, day, { weekday: 'long', day: 'numeric', month: 'long' });
          return (
            <div key={day} className="ct-cal-day" role="gridcell" aria-label={label} data-out={!inMonth(day) || undefined} data-today={day === today || undefined}>
              <span className="ct-cal-n">{Number(day.slice(8))}</span>
              {canCreate ? (
                <button type="button" className="btn btn-ghost btn-sm btn-icon ct-cal-add" onClick={() => onCreate(day)} aria-label={t('evt.cal.add', { date: label })}>
                  <IconPlus size={15} />
                </button>
              ) : null}
              {list.slice(0, MAX_PER_DAY).map((e) => chip(e, day))}
              {list.length > MAX_PER_DAY ? (
                <button type="button" className="btn btn-ghost btn-sm ct-cal-more" onClick={() => onDay(day)}>
                  {t('evt.cal.more', { n: list.length - MAX_PER_DAY })}
                </button>
              ) : null}
            </div>
          );
        })}
      </div>

      <div className="ct-agenda">
        {agendaDays.length === 0 ? <p className="small muted">{t('evt.cal.empty')}</p> : null}
        {agendaDays.map((day) => (
          <div key={day} className="ct-agenda-day" data-today={day === today || undefined}>
            <div className="ct-agenda-date">
              <b>{Number(day.slice(8))}</b>
              <span>{fmtWall(locale, day, { weekday: 'short' }).replace('.', '')}</span>
            </div>
            <div className="ct-agenda-list">
              {(byDay.get(day) ?? []).map((e) => chip(e, day))}
              {canCreate && !(byDay.get(day) ?? []).length ? (
                <button type="button" className="btn btn-ghost btn-sm" style={{ justifySelf: 'start' }} onClick={() => onCreate(day)}>
                  <IconPlus size={15} />
                  {t('evt.new')}
                </button>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
