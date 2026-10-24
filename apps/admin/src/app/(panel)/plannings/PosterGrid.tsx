'use client';

import { useEffect, useMemo, useRef, type CSSProperties } from 'react';

import { IconBan, IconMove, IconPlus } from '@/components/icons';
import { useI18n } from '@/i18n/client';
import type { MessageKey } from '@/i18n/messages';
import { buildWeekGrid, familleColor, heure, inkContrast, inkOn, normaliseActivite } from '@/lib/planning/model';
import type { ClubId, Slot, SlotException } from '@/lib/types';

/**
 * L'AFFICHE DU CLUB, à l'écran. La grille est celle de bc-plannings et de l'app
 * (mêmes bandes horaires, mêmes sous-colonnes quand deux cours se chevauchent,
 * l'accès libre en creux) : ce que la direction voit ici, c'est ce qui est
 * imprimé au mur et ce que l'adhérent lit dans l'app.
 *
 * Variante `admin` : le libellé exact de la direction, le coach, les outils au
 * survol (déplacer, annuler une séance) et « + » dans les cases libres.
 * Variante `member` : la lecture de l'app — libellé propre, public, pas de coach.
 */
export type PosterProps = {
  slots: Slot[];
  club: ClubId;
  espace?: string;
  variant?: 'admin' | 'member';
  /** Les sept dates (lundi → dimanche) de la semaine montrée : les annulations s'y lisent. */
  weekDates?: string[];
  exceptions?: SlotException[];
  /** Les jours de la semaine montrée où le club ferme (férié, gala) : l'accès libre y tombe aussi. */
  closedJours?: ReadonlySet<number>;
  todayJour?: number | null;
  nowMin?: number | null;
  highlightId?: string | null;
  focusCoach?: string | null;
  compact?: boolean;
  canEdit?: boolean;
  onOpen?: (slot: Slot) => void;
  onMove?: (slot: Slot) => void;
  onCancel?: (slot: Slot) => void;
  onAdd?: (at: { jour: number; debut: number; fin: number }) => void;
};

export function PosterGrid({ slots, club, espace, variant = 'admin', weekDates, exceptions = [], closedJours, todayJour = null, nowMin = null, highlightId, focusCoach, compact, canEdit, onOpen, onMove, onCancel, onAdd }: PosterProps) {
  const { t } = useI18n();
  const grid = useMemo(() => buildWeekGrid(slots, club, espace), [slots, club, espace]);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Le cours en surbrillance vient au milieu du cadre, même s'il tombe un samedi soir.
  useEffect(() => {
    const box = scrollRef.current;
    const hi = box?.querySelector<HTMLElement>('.pblock[data-hi]');
    if (!box || !hi) return;
    const target = hi.offsetLeft + hi.offsetWidth / 2 - box.clientWidth / 2;
    box.scrollTo({ left: Math.max(0, target), behavior: 'smooth' });
  }, [highlightId, slots, club, espace]);
  const admin = variant === 'admin';
  const dayName = (j: number) => t(`day.${j}` as MessageKey);
  const dayShort = (j: number) => t(`planning.dayShort.${j}` as MessageKey);

  // Une séance annulée la semaine montrée : la case garde le cours, barré, avec la raison.
  const cancelled = useMemo(() => {
    const map = new Map<string, SlotException>();
    if (!weekDates) return map;
    for (const e of exceptions) {
      const j = weekDates.indexOf(e.date);
      if (j >= 0) map.set(e.slotId, e);
    }
    return map;
  }, [exceptions, weekDates]);

  if (!grid.bands.length) {
    return <div className="poster-empty">{t('planning.poster.empty')}</div>;
  }

  const liveRow = nowMin === null || todayJour === null ? -1 : grid.bands.findIndex((b) => b.debut <= nowMin && nowMin < b.fin);
  const firstCol = new Map<number, number>();
  grid.columns.forEach((c, i) => {
    if (!firstCol.has(c.jour)) firstCol.set(c.jour, i);
  });
  const template = ['var(--gutter-w)', ...grid.columns.map((c) => (c.subCount > 1 ? 'minmax(var(--sub-w), 1fr)' : 'minmax(var(--day-w), 1fr)'))].join(' ');
  const rows = `var(--head-h) repeat(${grid.bands.length}, var(--row-h))`;
  // Les colonnes se partagent la largeur ; en dessous de leur minimum, l'affiche défile à l'horizontale.
  const singles = grid.columns.filter((c) => c.subCount === 1).length;
  const minWidth = `calc(var(--gutter-w) + ${singles} * var(--day-w) + ${grid.columns.length - singles} * var(--sub-w))`;
  const focusNorm = focusCoach?.trim().toUpperCase();

  const blocks: React.ReactNode[] = [];
  grid.cells.forEach((rowCells, r) => {
    rowCells.forEach((cell, c) => {
      if (cell.kind !== 'course' && cell.kind !== 'free') return;
      const col = grid.columns[c];
      const area: CSSProperties = { gridRow: `${r + 2} / span ${cell.rowSpan}`, gridColumn: `${c + 2}` };
      if (cell.kind === 'free') {
        blocks.push(
          <div key={`f-${r}-${c}`} className="pfree" style={area} aria-hidden="true" data-closed={closedJours?.has(col.jour) || undefined}>
            {cell.rowSpan > 1 || !compact ? <span>{closedJours?.has(col.jour) ? t('planning.closedDay') : t('planning.free')}</span> : null}
          </div>,
        );
        return;
      }
      const s = cell.slot;
      const a = normaliseActivite(s.activite);
      const bg = familleColor(a.famille);
      const ink = admin ? inkContrast(bg) : inkOn(bg);
      const exc = cancelled.get(s.id);
      const dim = Boolean(focusNorm) && (s.coach ?? '').trim().toUpperCase() !== focusNorm;
      const title = admin ? s.activite : a.libelle.toUpperCase();
      const meta = admin ? s.coach : [a.public, a.niveau].filter(Boolean).join(' · ');
      const when = `${heure(s.debut)}–${heure(s.fin)}`;
      const label = [dayName(col.jour), when, admin ? s.activite : a.libelle, s.espace, admin && s.coach ? t('planning.coachOf', { name: s.coach }) : null, exc ? t('planning.cancelledOn', { motif: exc.motif }) : null].filter(Boolean).join(' · ');
      blocks.push(
        <div
          key={s.id}
          className="pblock"
          style={{ ...area, '--bg': bg, '--ink': ink, animationDelay: `${Math.min(r + c, 18) * 14}ms` } as CSSProperties}
          data-cancelled={exc ? true : undefined}
          data-hi={highlightId === s.id || undefined}
          data-dim={dim || undefined}
          data-span={cell.rowSpan}
        >
          <button type="button" className="pblock-main" onClick={onOpen ? () => onOpen(s) : undefined} aria-label={label} tabIndex={onOpen ? 0 : -1} disabled={!onOpen}>
            <span className="pblock-title">{title}</span>
            {meta && (cell.rowSpan > 1 || !compact) ? <span className="pblock-meta">{meta}</span> : null}
            {admin && !compact && cell.rowSpan > 1 ? <span className="pblock-time">{when}</span> : null}
          </button>
          {exc ? (
            <span className="pblock-cancel" aria-hidden="true">
              {t('planning.cancelled')}
            </span>
          ) : null}
          {admin && canEdit && (onMove || onCancel) ? (
            <span className="pblock-tools">
              {onMove ? (
                <button type="button" onClick={() => onMove(s)} aria-label={t('planning.tool.move', { name: s.activite })} title={t('planning.tool.moveShort')}>
                  <IconMove size={15} />
                </button>
              ) : null}
              {onCancel ? (
                <button type="button" onClick={() => onCancel(s)} aria-label={t('planning.tool.cancel', { name: s.activite })} title={t('planning.tool.cancelShort')}>
                  <IconBan size={15} />
                </button>
              ) : null}
            </span>
          ) : null}
        </div>,
      );
    });
  });

  return (
    <div className="poster" data-variant={variant} data-compact={compact || undefined}>
      <div className="poster-scroll" ref={scrollRef}>
        <div className="poster-grid" style={{ gridTemplateColumns: template, gridTemplateRows: rows, minWidth }}>
          <div className="poster-corner" style={{ gridRow: 1, gridColumn: 1 }}>
            {t('planning.hour')}
          </div>
          {grid.days.map((j) => {
            const start = firstCol.get(j)!;
            const span = grid.columns[start].subCount;
            const isToday = j === todayJour;
            return (
              <div key={`d-${j}`} className="poster-day" data-today={isToday || undefined} style={{ gridRow: 1, gridColumn: `${start + 2} / span ${span}` }}>
                <span className="poster-day-label">
                  <span className="poster-day-long">{dayName(j)}</span>
                  <span className="poster-day-short" aria-hidden="true">
                    {dayShort(j)}
                  </span>
                </span>
                {weekDates && !compact ? <span className="poster-day-date">{weekDates[j]?.slice(8)}</span> : null}
              </div>
            );
          })}
          {grid.bands.map((b, r) => (
            <div key={`g-${b.debut}`} className="poster-hour" data-live={r === liveRow || undefined} style={{ gridRow: r + 2, gridColumn: 1 }}>
              <b>{heure(b.debut)}</b>
              <span>{heure(b.fin)}</span>
            </div>
          ))}
          {grid.bands.map((b, r) =>
            grid.columns.map((col, c) => {
              const kind = grid.cells[r][c].kind;
              const addable = admin && canEdit && onAdd && kind !== 'course' && !(kind === 'covered' && isCourseCovered(grid.cells, r, c));
              return (
                <div key={`c-${r}-${c}`} className="poster-cell" data-first={col.sub === 0 || undefined} data-today={col.jour === todayJour || undefined} style={{ gridRow: r + 2, gridColumn: c + 2 }}>
                  {addable ? (
                    <button type="button" className="poster-add" tabIndex={-1} onClick={() => onAdd!({ jour: col.jour, debut: b.debut, fin: b.fin })} aria-label={t('planning.addAt', { day: dayName(col.jour), time: heure(b.debut) })}>
                      <IconPlus size={14} />
                    </button>
                  ) : null}
                </div>
              );
            }),
          )}
          {blocks}
        </div>
      </div>
    </div>
  );
}

/** Une case « couverte » l'est-elle par un cours (et non par de l'accès libre) ? */
function isCourseCovered(cells: ReturnType<typeof buildWeekGrid>['cells'], r: number, c: number): boolean {
  for (let i = r - 1; i >= 0; i--) {
    const k = cells[i][c].kind;
    if (k === 'course') return true;
    if (k === 'free' || k === 'empty') return false;
  }
  return false;
}
