'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { saveClubHours, undoPlanning } from './actions';
import { motifLabel } from './SlotDrawer';
import { Dialog } from '@/components/Dialog';
import { IconAlert, IconCalendarOff, IconCheck, IconClock, IconCopy } from '@/components/icons';
import { useToast } from '@/components/Toast';
import { Chips, Switch, TextInput } from '@/components/wizard/fields';
import { useI18n } from '@/i18n/client';
import type { MessageKey } from '@/i18n/messages';
import { CLUB_LABEL } from '@/lib/clubs';
import { fmtDate } from '@/lib/format';
import { checkWeek, freeRanges, hoursOf, outsideHours, RESEAU, sameWeek, weekSummary, type DayInput } from '@/lib/planning/hours';
import { familleColor, heure, hhmmOf, isFree, minutesOf, normaliseActivite } from '@/lib/planning/model';
import type { ClubId, Closure, DayHours, PlanningState, Slot, SlotException, WeekHours } from '@/lib/types';

/**
 * LES HORAIRES ET L'ACCÈS LIBRE (CDC §7, §11 A.3). Eddy, 24/10/2026 : l'accès
 * libre est toujours ouvert quand le club l'est, et ses heures se règlent ici.
 * Sept jours, une ligne chacun : ouvert ou fermé, de quelle heure à quelle
 * heure, la journée dessinée avec ses cours, et l'accès libre qui en découle —
 * l'ouverture, ou les lignes « Accès libre » que le planning écrit ce jour-là.
 */

type DayDraft = { open: boolean; debut: string; fin: string };

const DAYS = [0, 1, 2, 3, 4, 5, 6];

/** « 00:00 » en fin de journée : minuit. */
const finOf = (v: string) => {
  const m = minutesOf(v);
  return m === 0 ? 24 * 60 : m;
};

function toDraft(week: WeekHours): DayDraft[] {
  const fallback = week.find((d): d is NonNullable<DayHours> => d !== null) ?? RESEAU[0]!;
  return week.map((d) => {
    const h = d ?? fallback;
    return { open: d !== null, debut: hhmmOf(h.debut), fin: h.fin === 24 * 60 ? '00:00' : hhmmOf(h.fin) };
  });
}

const toInput = (draft: DayDraft[]): DayInput[] => draft.map((d) => (d.open ? { debut: d.debut, fin: d.fin } : null));

/** Les heures d'un jour telles que saisies, si elles se lisent ; sinon rien à dessiner. */
function parseDay(d: DayDraft): DayHours {
  if (!d.open) return null;
  const debut = minutesOf(d.debut);
  const fin = finOf(d.fin);
  return debut !== null && fin !== null && fin > debut ? { debut, fin } : null;
}

export type HoursProps = {
  club: ClubId;
  slots: Slot[];
  horaires: PlanningState['horaires'];
  source: PlanningState['horairesSource'];
  closures: Closure[];
  exceptions: SlotException[];
  today: string;
  canEdit: boolean;
  editable: ClubId[];
  onOpen: (s: Slot) => void;
  onCloseDay?: () => void;
};

export function HoursView({ club, slots, horaires, source, closures, exceptions, today, canEdit, editable, onOpen, onCloseDay }: HoursProps) {
  const { t, locale } = useI18n();
  const toast = useToast();
  const router = useRouter();
  const [pending, start] = useTransition();
  const saved = hoursOf(horaires, club);
  const savedDraft = toDraft(saved);
  const savedKey = `${club}|${JSON.stringify(saved)}`;
  const [seen, setSeen] = useState(savedKey);
  const [draft, setDraft] = useState<DayDraft[]>(() => toDraft(saved));
  const [also, setAlso] = useState<ClubId[]>([]);
  const [confirm, setConfirm] = useState<Slot[] | null>(null);
  // Un autre club, ou des heures enregistrées entre-temps : on repart de ce qui est enregistré.
  if (seen !== savedKey) {
    setSeen(savedKey);
    setDraft(toDraft(saved));
    setAlso([]);
    setConfirm(null);
  }

  const dayShort = (j: number) => t(`planning.dayShort.${j}` as MessageKey).toLowerCase();
  const summary = (w: WeekHours) => weekSummary(w, dayShort, t('planning.hours.closedShort'));
  const { week, errors } = checkWeek(toInput(draft));
  const shown: WeekHours = week ?? draft.map(parseDay);
  const dirty = !week || !sameWeek(week, saved);
  const targets = [club, ...also.filter((c) => c !== club)];
  const outsideHere = outsideHours(slots, shown, club);
  const others = editable.filter((c) => c !== club);

  // L'échelle de la journée : de 6h (plus tôt si un cours ou l'ouverture commence avant) à minuit.
  const scaleStart = Math.floor(Math.min(6 * 60, ...shown.flatMap((d) => (d ? [d.debut] : [])), ...slots.filter((s) => s.club === club).map((s) => s.debut)) / 60) * 60;
  const span = 24 * 60 - scaleStart;
  const pos = (a: number, b: number) => ({ left: `${((a - scaleStart) / span) * 100}%`, width: `${(Math.max(0, b - a) / span) * 100}%` });
  const ticks = [];
  for (let h = Math.ceil(scaleStart / 180) * 3; h <= 24; h += 3) ticks.push(h);

  const setDay = (j: number, patch: Partial<DayDraft>) => setDraft((cur) => cur.map((d, i) => (i === j ? { ...d, ...patch } : d)));
  const copyToOpenDays = (j: number) => setDraft((cur) => cur.map((d) => (d.open ? { ...d, debut: cur[j]!.debut, fin: cur[j]!.fin } : d)));

  const save = (force: boolean) =>
    start(async () => {
      const res = await saveClubHours(targets, toInput(draft), force);
      if (!res.ok) {
        if (res.error === 'conflit' && week) {
          setConfirm(targets.flatMap((c) => outsideHours(slots, week, c)));
          return;
        }
        const field = res.fieldErrors ? Object.values(res.fieldErrors)[0] : undefined;
        toast({ text: t((field ?? `err.${res.error}`) as MessageKey), kind: 'err' });
        return;
      }
      setConfirm(null);
      toast({
        text: t('planning.hours.saved', { n: res.data.changed }),
        kind: 'ok',
        undo: async () => {
          await undoPlanning(res.data.changeId);
          router.refresh();
        },
      });
      router.refresh();
    });

  const onSave = () => {
    if (!week) return;
    const outside = targets.flatMap((c) => outsideHours(slots, week, c));
    if (outside.length) setConfirm(outside);
    else save(false);
  };

  const upcoming = closures.filter((c) => c.clubs.includes(club) && c.date >= today).sort((a, b) => a.date.localeCompare(b.date));
  const clubOf = new Map(slots.map((s) => [s.id, s.club]));
  const sessionsOf = (c: Closure) => exceptions.filter((e) => e.date === c.date && clubOf.get(e.slotId) === club).length;

  return (
    <div className="stack" style={{ '--gap': '18px' } as React.CSSProperties}>
      <section className="panel hours-panel" aria-labelledby="hours-title">
        <div className="panel-head">
          <div>
            <h2 id="hours-title" className="panel-title">
              {t('planning.hours.title', { club: CLUB_LABEL[club] })}
            </h2>
            <p className="panel-sub">{t('planning.hours.sub')}</p>
          </div>
          <span className="tag hours-summary" title={t('planning.hours.savedNow')}>
            <IconClock size={14} />
            {summary(saved)}
          </span>
        </div>

        <div className="panel-body">
          <div className="hours-grid">
            <div className="hours-head" aria-hidden="true">
              <span className="hours-name">{t('planning.hours.c.day')}</span>
              <span className="hours-switch">{t('planning.hours.c.open')}</span>
              <span className="hours-time">{t('planning.hours.c.from')}</span>
              <span className="hours-time">{t('planning.hours.c.to')}</span>
              <span className="hours-bar hours-ticks">
                {ticks.map((h) => (
                  <span key={h} style={{ left: `${((h * 60 - scaleStart) / span) * 100}%` }}>{h}h</span>
                ))}
              </span>
              <span className="hours-free">{t('planning.hours.c.free')}</span>
            </div>

            <ol className="hours-days">
              {DAYS.map((j) => {
                const d = draft[j]!;
                const parsed = parseDay(d);
                const err = errors[`d${j}`];
                const dayName = t(`day.${j}` as MessageKey);
                const courses = slots.filter((s) => s.club === club && s.jour === j && !isFree(s)).sort((a, b) => a.debut - b.debut);
                const free = freeRanges(slots, shown, club, j);
                const off = new Set(outsideHere.filter((s) => s.jour === j).map((s) => s.id));
                const changed = !sameDayDraft(d, savedDraft[j]!);
                return (
                  <li key={j} className="hours-day" data-closed={!d.open || undefined} data-changed={changed || undefined}>
                    <span className="hours-name">
                      <b>{dayName}</b>
                      {changed ? <span className="hours-dot" title={t('planning.hours.changed')} /> : null}
                    </span>
                    <span className="hours-switch">
                      <Switch id={`h-open-${j}`} checked={d.open} disabled={!canEdit} label={t('planning.hours.openOn', { day: dayName })} onChange={(v) => setDay(j, { open: v })} />
                      <span className="hours-state">{d.open ? t('planning.hours.open') : t('planning.hours.closed')}</span>
                    </span>
                    <span className="hours-time">
                      <TextInput id={`h-from-${j}`} type="time" step={300} value={d.debut} disabled={!canEdit || !d.open} error={err} aria-describedby={err ? `hours-err-${j}` : undefined} aria-label={t('planning.hours.fromOn', { day: dayName })} onChange={(e) => setDay(j, { debut: e.target.value })} />
                    </span>
                    <span className="hours-time">
                      <TextInput id={`h-to-${j}`} type="time" step={300} value={d.fin} disabled={!canEdit || !d.open} error={err} aria-describedby={err ? `hours-err-${j}` : undefined} aria-label={t('planning.hours.toOn', { day: dayName })} onChange={(e) => setDay(j, { fin: e.target.value })} />
                      {canEdit ? (
                        // Toujours à sa place, même invisible : les champs gardent la même largeur d'un jour à l'autre.
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm btn-icon hours-copy"
                          title={t('planning.hours.copy')}
                          aria-label={t('planning.hours.copyFrom', { day: dayName })}
                          disabled={!parsed}
                          data-off={!parsed || undefined}
                          onClick={() => copyToOpenDays(j)}
                        >
                          <IconCopy size={15} />
                        </button>
                      ) : null}
                    </span>
                    <span className="hours-bar" data-closed={!parsed || undefined}>
                      {parsed ? <span className="hours-open" data-free={free[0]?.source === 'ouverture' || undefined} style={pos(parsed.debut, parsed.fin)} /> : <span className="hours-closed">{t('planning.hours.closed')}</span>}
                      {free
                        .filter((f) => f.source === 'planning')
                        .map((f) => (
                          <span key={f.slotId} className="hours-line" style={pos(f.debut, f.fin)} title={`${t('planning.free')} · ${heure(f.debut)}–${heure(f.fin)}${f.espace ? ` · ${f.espace}` : ''}`} />
                        ))}
                      {courses.map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          className="hours-course"
                          data-outside={off.has(s.id) || undefined}
                          style={{ ...pos(s.debut, s.fin), '--c': familleColor(normaliseActivite(s.activite).famille) } as React.CSSProperties}
                          title={`${heure(s.debut)}–${heure(s.fin)} · ${s.activite}${s.espace ? ` · ${s.espace}` : ''}`}
                          aria-label={`${dayName} ${heure(s.debut)} · ${s.activite}`}
                          onClick={() => onOpen(s)}
                        />
                      ))}
                    </span>
                    <span className="hours-free">
                      {free.length ? (
                        <>
                          <span className="hours-free-times">{free.map((f) => `${heure(f.debut)}–${heure(f.fin)}`).join(' · ')}</span>
                          <span className="hours-free-src" data-src={free[0]!.source}>
                            {free[0]!.source === 'ouverture' ? t('planning.hours.src.ouverture') : t('planning.hours.src.planning', { n: free.length })}
                          </span>
                        </>
                      ) : (
                        <span className="muted">{t('planning.hours.noFree')}</span>
                      )}
                      {off.size ? (
                        <span className="tag tag-warn">
                          <IconAlert size={13} />
                          {t('planning.hours.outside', { n: off.size })}
                        </span>
                      ) : courses.length ? (
                        <span className="hours-courses">{t('planning.hours.courses', { n: courses.length })}</span>
                      ) : null}
                    </span>
                    {err ? (
                      <p className="field-error hours-err" id={`hours-err-${j}`}>
                        <IconAlert size={15} />
                        <span>{t(err as MessageKey)}</span>
                      </p>
                    ) : null}
                  </li>
                );
              })}
            </ol>
          </div>

          <ul className="legend hours-legend" aria-label={t('planning.legend')}>
            <li>
              <span className="swatch hours-sw-open" aria-hidden="true" />
              {t('planning.hours.lg.open')}
            </li>
            <li>
              <span className="swatch hours-sw-line" aria-hidden="true" />
              {t('planning.hours.lg.line')}
            </li>
            <li>
              <span className="swatch hours-sw-course" aria-hidden="true" />
              {t('planning.hours.lg.course')}
            </li>
            <li>
              <span className="swatch hours-sw-outside" aria-hidden="true" />
              {t('planning.hours.lg.outside')}
            </li>
          </ul>

          {canEdit ? (
            <div className="hours-foot">
              {others.length ? (
                <div className="hours-also">
                  <span className="field-label">{t('planning.hours.also')}</span>
                  <Chips<ClubId> id="hours-also" values={also} onChange={setAlso} options={others.map((c) => ({ value: c, label: CLUB_LABEL[c] }))} />
                </div>
              ) : null}
              <div className="hours-actions">
                {!sameWeek(shown, RESEAU) ? (
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => setDraft(toDraft(RESEAU))}>
                    {t('planning.hours.network', { rule: summary(RESEAU) })}
                  </button>
                ) : null}
                {dirty ? (
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => setDraft(toDraft(saved))}>
                    {t('planning.hours.reset')}
                  </button>
                ) : null}
                <button type="button" className="btn btn-primary" disabled={pending || !week || (!dirty && !also.some((c) => !sameWeek(hoursOf(horaires, c), saved)))} onClick={onSave}>
                  <IconCheck size={17} />
                  {targets.length > 1 ? t('planning.hours.saveMany', { n: targets.length }) : t('planning.hours.save')}
                </button>
              </div>
            </div>
          ) : (
            <p className="field-help">{t('planning.outOfScope')}</p>
          )}

          <p className="field-help hours-source">
            {source?.from === 'regle' ? t('planning.hours.from.regle', { path: source.path, error: source.error ?? '' }) : t('planning.hours.from.app', { path: source?.path ?? 'apps/mobile/src/data/clubs.ts' })} {t('planning.hours.appReads')}
          </p>
        </div>
      </section>

      <section className="panel" aria-labelledby="closures-title">
        <div className="panel-head">
          <div>
            <h3 id="closures-title" className="panel-title">
              {t('planning.hours.closures')}
            </h3>
            <p className="panel-sub">{t('planning.hours.closures.sub')}</p>
          </div>
          {canEdit && onCloseDay ? (
            <button type="button" className="btn btn-secondary btn-sm" onClick={onCloseDay}>
              <IconCalendarOff size={16} />
              {t('planning.act.close')}
            </button>
          ) : null}
        </div>
        <div className="panel-body">
          {upcoming.length ? (
            <ul className="hours-closures">
              {upcoming.map((c) => (
                <li key={c.id}>
                  <b>{cap(fmtDate(locale, c.date, { weekday: 'long', day: 'numeric', month: 'long' }))}</b>
                  <span>{motifLabel(t, c.motif)}</span>
                  <span className="muted">
                    {t('planning.sessionsCount', { n: sessionsOf(c) })} · {t('planning.hours.closures.free')}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">{t('planning.hours.closures.none')}</p>
          )}
        </div>
      </section>

      <Dialog open={confirm !== null} onClose={() => setConfirm(null)} className="modal" labelledBy="hours-confirm-title">
        <div className="modal-head">
          <div>
            <h2 id="hours-confirm-title" className="modal-title">
              {t('planning.hours.confirm.title', { n: confirm?.length ?? 0 })}
            </h2>
            <p className="modal-sub">{t('planning.hours.confirm.sub')}</p>
          </div>
        </div>
        <div className="modal-body">
          <ul className="hours-outside">
            {(confirm ?? []).map((s) => (
              <li key={s.id}>
                <span className="course-dot" style={{ background: familleColor(normaliseActivite(s.activite).famille) }} aria-hidden="true" />
                <span className="mono">
                  {t(`planning.dayShort.${s.jour}` as MessageKey)} {heure(s.debut)}–{heure(s.fin)}
                </span>
                <span>
                  {s.activite} <span className="muted">· {CLUB_LABEL[s.club]}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
        <div className="modal-foot">
          <button type="button" className="btn btn-ghost" onClick={() => setConfirm(null)}>
            {t('planning.hours.confirm.back')}
          </button>
          <button type="button" className="btn btn-primary" disabled={pending} onClick={() => save(true)}>
            {t('planning.hours.confirm.go')}
          </button>
        </div>
      </Dialog>
    </div>
  );
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const sameDayDraft = (a: DayDraft, b: DayDraft) => a.open === b.open && (!a.open || (a.debut === b.debut && a.fin === b.fin));
