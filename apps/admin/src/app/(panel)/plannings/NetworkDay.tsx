'use client';

import type { CSSProperties } from 'react';

import { useI18n } from '@/i18n/client';
import type { MessageKey } from '@/i18n/messages';
import { CLUB_IDS, CLUB_LABEL } from '@/lib/clubs';
import { espacesFor, familleColor, heure, inkContrast, isFree, normaliseActivite } from '@/lib/planning/model';
import type { ClubId, Slot, SlotException } from '@/lib/types';

/**
 * LA JOURNÉE DU RÉSEAU — les cinq clubs côte à côte, sur une vraie échelle de
 * temps (une minute = un pixel et quart) : ce que l'affiche ne peut pas
 * montrer, parce qu'elle range chaque club dans ses propres bandes. On y voit
 * d'un coup d'œil qui est ouvert à 12 h 40, où sont les cours enfants du
 * mercredi, et quel coach passe d'un club à l'autre.
 */
const PX = 1.25;

type Lane = { key: string; label?: string; slots: Slot[] };

function lanesFor(all: Slot[], club: ClubId, jour: number): { lanes: Lane[]; free: Slot[] } {
  const day = all.filter((s) => s.club === club && s.jour === jour);
  const free = day.filter(isFree);
  const courses = day.filter((s) => !isFree(s)).sort((a, b) => a.debut - b.debut || b.fin - a.fin);
  const espaces = espacesFor(all, club);
  if (espaces.length) {
    // Un espace par couloir ; deux cours qui se chevauchent dans le même espace ouvrent un second couloir.
    const lanes: Lane[] = [];
    for (const e of espaces) {
      const ends: number[] = [];
      const groups: Slot[][] = [];
      for (const s of courses.filter((x) => x.espace === e)) {
        let i = ends.findIndex((end) => end <= s.debut);
        if (i < 0) {
          i = ends.length;
          ends.push(0);
          groups.push([]);
        }
        ends[i] = s.fin;
        groups[i].push(s);
      }
      if (!groups.length) groups.push([]);
      groups.forEach((g, i) => lanes.push({ key: `${e}-${i}`, label: i === 0 ? e : undefined, slots: g }));
    }
    return { lanes, free };
  }
  const ends: number[] = [];
  const groups: Slot[][] = [];
  for (const s of courses) {
    let i = ends.findIndex((end) => end <= s.debut);
    if (i < 0) {
      i = ends.length;
      ends.push(0);
      groups.push([]);
    }
    ends[i] = s.fin;
    groups[i].push(s);
  }
  if (!groups.length) groups.push([]);
  return { lanes: groups.map((g, i) => ({ key: String(i), slots: g })), free };
}

export function NetworkDay({ slots, jour, date, exceptions, nowMin, focusCoach, onOpen, onPickDay }: { slots: Slot[]; jour: number; date: string; exceptions: SlotException[]; nowMin: number | null; focusCoach?: string | null; onOpen: (s: Slot) => void; onPickDay: (j: number) => void }) {
  const { t } = useI18n();
  const day = slots.filter((s) => s.jour === jour);
  const start = day.length ? Math.floor(Math.min(...day.map((s) => s.debut)) / 60) * 60 : 9 * 60;
  const end = day.length ? Math.ceil(Math.max(...day.map((s) => s.fin)) / 60) * 60 : 22 * 60;
  const height = (end - start) * PX;
  const hours: number[] = [];
  for (let m = start; m <= end; m += 60) hours.push(m);
  const cancelled = new Set(exceptions.filter((e) => e.date === date).map((e) => e.slotId));
  const focus = focusCoach?.trim().toUpperCase();
  const daysWith = [0, 1, 2, 3, 4, 5, 6].filter((j) => slots.some((s) => s.jour === j));
  // Un club à trois espaces a besoin de trois fois la place d'un club à une salle.
  const byClub = CLUB_IDS.map((club) => ({ club, ...lanesFor(slots, club, jour) }));
  const template = ['54px', ...byClub.map((c) => `minmax(${c.lanes.length * 104}px, ${c.lanes.length}fr)`)].join(' ');
  const minWidth = 54 + byClub.reduce((n, c) => n + c.lanes.length * 104, 0);

  return (
    <div className="net">
      <div className="net-days" role="tablist" aria-label={t('planning.net.days')}>
        {daysWith.map((j) => (
          <button key={j} type="button" role="tab" aria-selected={j === jour} className="net-day" onClick={() => onPickDay(j)}>
            {t(`day.${j}` as MessageKey)}
            <small>{t('planning.sessionsCount', { n: slots.filter((s) => s.jour === j && !isFree(s)).length })}</small>
          </button>
        ))}
      </div>
      <div className="net-scroll">
        <div className="net-grid" style={{ '--net-h': `${height}px`, gridTemplateColumns: template, minWidth } as CSSProperties}>
          <div className="net-axis" aria-hidden="true">
            {hours.map((m) => (
              <span key={m} style={{ top: (m - start) * PX }}>
                {heure(m)}
              </span>
            ))}
          </div>
          {byClub.map(({ club, lanes, free }) => {
            const labelled = lanes.some((l) => l.label);
            return (
              <section key={club} className="net-club" aria-label={CLUB_LABEL[club]}>
                <header className="net-club-head">
                  <b>{CLUB_LABEL[club]}</b>
                  <span>{t('planning.sessionsCount', { n: lanes.reduce((n, l) => n + l.slots.length, 0) })}</span>
                  {labelled ? (
                    <span className="net-lane-heads" style={{ gridTemplateColumns: `repeat(${lanes.length}, minmax(0, 1fr))` }}>
                      {lanes.map((l) => (
                        <span key={l.key}>{l.label ?? ''}</span>
                      ))}
                    </span>
                  ) : null}
                </header>
                <div className="net-body" style={{ height }}>
                  {hours.map((m) => (
                    <span key={m} className="net-line" style={{ top: (m - start) * PX }} aria-hidden="true" />
                  ))}
                  {free.map((s) => (
                    <span key={s.id} className="net-free" style={{ top: (s.debut - start) * PX, height: (s.fin - s.debut) * PX }} title={`${t('planning.free')} ${heure(s.debut)}–${heure(s.fin)}`} aria-hidden="true" />
                  ))}
                  <div className="net-lanes" style={{ gridTemplateColumns: `repeat(${lanes.length}, minmax(0, 1fr))` }}>
                    {lanes.map((lane) => (
                      <div key={lane.key} className="net-lane">
                        {lane.slots.map((s) => {
                          const a = normaliseActivite(s.activite);
                          const bg = familleColor(a.famille);
                          const h = (s.fin - s.debut) * PX;
                          const off = cancelled.has(s.id);
                          const dim = Boolean(focus) && (s.coach ?? '').trim().toUpperCase() !== focus;
                          return (
                            <button
                              key={s.id}
                              type="button"
                              className="net-block"
                              data-cancelled={off || undefined}
                              data-dim={dim || undefined}
                              style={{ top: (s.debut - start) * PX + 1, height: Math.max(18, h - 2), '--bg': bg, '--ink': inkContrast(bg) } as CSSProperties}
                              onClick={() => onOpen(s)}
                              aria-label={`${CLUB_LABEL[club]} · ${heure(s.debut)}–${heure(s.fin)} · ${s.activite}${s.coach && s.coach !== 'ACCES LIBRE' ? ` · ${s.coach}` : ''}${off ? ` · ${t('planning.cancelled')}` : ''}`}
                            >
                              <span className="net-time">{heure(s.debut)}</span>
                              <span className="net-name">{s.activite}</span>
                              {h > 52 && s.coach && s.coach !== 'ACCES LIBRE' ? <span className="net-coach">{s.coach}</span> : null}
                            </button>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                  {nowMin !== null && nowMin >= start && nowMin <= end ? <span className="net-now" style={{ top: (nowMin - start) * PX }} aria-hidden="true" /> : null}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}
