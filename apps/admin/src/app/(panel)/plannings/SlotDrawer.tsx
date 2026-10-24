'use client';

import Link from 'next/link';

import { Dialog } from '@/components/Dialog';
import { IconBan, IconBell, IconClose, IconMove, IconTrash, IconUndo } from '@/components/icons';
import { useI18n } from '@/i18n/client';
import { motifLabel } from '@/lib/planning/motifs';
import type { MessageKey } from '@/i18n/messages';
import { CLUB_LABEL } from '@/lib/clubs';
import { fmtDate, relative } from '@/lib/format';
import { duree, familleColor, heure, nextDates, normaliseActivite } from '@/lib/planning/model';
import type { PlanningChange, Slot, SlotException } from '@/lib/types';
import { useNow } from '@/components/useNow';

/**
 * La fiche d'un cours, ouverte d'un clic sur l'affiche : ce qu'il est, ses
 * prochaines dates (une séance annulée se rétablit d'ici), son histoire, et ce
 * que l'adhérent en lit dans l'app — le même cours, sans le nom du coach.
 */
export function SlotDrawer({
  slot,
  exceptions,
  history,
  today,
  canEdit,
  onClose,
  onMove,
  onCancel,
  onRemove,
  onRestore,
}: {
  slot: Slot | null;
  exceptions: SlotException[];
  history: PlanningChange[];
  today: string;
  canEdit: boolean;
  onClose: () => void;
  onMove: (s: Slot) => void;
  onCancel: (s: Slot, date?: string) => void;
  onRemove: (s: Slot) => void;
  onRestore: (e: SlotException) => void;
}) {
  const { t, locale } = useI18n();
  const now = useNow();
  const open = Boolean(slot);
  const a = slot ? normaliseActivite(slot.activite) : null;
  const dates = slot ? nextDates(slot.jour, today, 6) : [];
  const mine = slot ? history.filter((h) => h.slotId === slot.id).slice(0, 8) : [];
  const excOf = (d: string) => (slot ? exceptions.find((e) => e.slotId === slot.id && e.date === d) : undefined);

  return (
    <Dialog open={open} onClose={onClose} className="sheet" labelledBy="slot-title">
      {slot && a ? (
        <>
          <div className="sheet-head">
            <div className="slot-head">
              <span className="slot-dot" style={{ background: familleColor(a.famille) }} aria-hidden="true" />
              <div>
                <p className="eyebrow">{t(`planning.famille.${a.famille}` as MessageKey)}</p>
                <h2 id="slot-title" className="slot-title">
                  {slot.activite}
                </h2>
              </div>
            </div>
            <button type="button" className="btn btn-ghost btn-icon" onClick={onClose} aria-label={t('btn.close')}>
              <IconClose />
            </button>
          </div>
          <div className="sheet-body stack" style={{ '--gap': '22px' } as React.CSSProperties}>
            <dl className="facts">
              <div>
                <dt>{t('planning.f.club')}</dt>
                <dd>
                  {CLUB_LABEL[slot.club]}
                  {slot.espace ? ` · ${t('planning.espaceOf', { name: slot.espace })}` : ''}
                </dd>
              </div>
              <div>
                <dt>{t('planning.f.when')}</dt>
                <dd>
                  {t(`day.${slot.jour}` as MessageKey)} · {heure(slot.debut)}–{heure(slot.fin)} <span className="muted">({duree(slot.fin - slot.debut)})</span>
                </dd>
              </div>
              <div>
                <dt>{t('planning.f.coach')}</dt>
                <dd>{slot.coach && slot.coach !== 'ACCES LIBRE' ? slot.coach : <span className="muted">{t('planning.noCoach')}</span>}</dd>
              </div>
              {a.public || a.niveau ? (
                <div>
                  <dt>{t('planning.f.public')}</dt>
                  <dd>{[a.public, a.niveau].filter(Boolean).join(' · ')}</dd>
                </div>
              ) : null}
            </dl>

            {canEdit ? (
              <div className="row" style={{ '--gap': '8px' } as React.CSSProperties}>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => onMove(slot)}>
                  <IconMove size={16} />
                  {t('planning.act.move')}
                </button>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => onCancel(slot)}>
                  <IconBan size={16} />
                  {t('planning.act.cancelOne')}
                </button>
                <button type="button" className="btn btn-danger btn-sm" onClick={() => onRemove(slot)}>
                  <IconTrash size={16} />
                  {t('planning.act.remove')}
                </button>
              </div>
            ) : null}

            <section aria-labelledby="slot-next">
              <h3 id="slot-next" className="drawer-h">
                {t('planning.next')}
              </h3>
              <ul className="next-dates">
                {dates.map((d) => {
                  const e = excOf(d);
                  return (
                    <li key={d} data-cancelled={e ? true : undefined}>
                      <span className="next-date">{fmtDate(locale, d, { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                      {e ? (
                        <>
                          <span className="tag tag-neg">{t('planning.cancelled')}</span>
                          <span className="next-motif">{motifLabel(t, e.motif)}</span>
                          {canEdit ? (
                            <button type="button" className="btn btn-ghost btn-sm" onClick={() => onRestore(e)}>
                              <IconUndo size={15} />
                              {t('planning.act.restore')}
                            </button>
                          ) : null}
                        </>
                      ) : canEdit ? (
                        <button type="button" className="btn btn-ghost btn-sm next-cancel" onClick={() => onCancel(slot, d)}>
                          {t('planning.act.cancelThis')}
                        </button>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </section>

            <section aria-labelledby="slot-app" className="slot-app">
              <h3 id="slot-app" className="drawer-h">
                {t('planning.inApp')}
              </h3>
              <div className="app-preview-card" data-theme-scope>
                <span className="app-preview-bar" style={{ background: familleColor(a.famille) }} aria-hidden="true" />
                <div>
                  <p className="app-preview-title">{a.libelle}</p>
                  <p className="app-preview-meta">
                    {t(`day.${slot.jour}` as MessageKey)} · {heure(slot.debut)}–{heure(slot.fin)} · {duree(slot.fin - slot.debut)}
                    {slot.espace ? ` · ${slot.espace}` : ''}
                  </p>
                  {a.public || a.niveau ? <p className="app-preview-meta">{[a.public, a.niveau].filter(Boolean).join(' · ')}</p> : null}
                </div>
              </div>
              <p className="field-help">{t('planning.inApp.help')}</p>
              <Link className="btn btn-ghost btn-sm" href={`/notifications?nouveau=1&from=planning:${encodeURIComponent(slot.id)}`}>
                <IconBell size={16} />
                {t('planning.act.notify')}
              </Link>
            </section>

            <section aria-labelledby="slot-hist">
              <h3 id="slot-hist" className="drawer-h">
                {t('planning.history.slot')}
              </h3>
              {mine.length ? (
                <ol className="hist">
                  {mine.map((h) => (
                    <li key={h.id}>
                      <span className="hist-what">{t(`planning.kind.${h.kind}` as MessageKey)}</span>
                      <span className="hist-who">
                        {h.by} · {relative(t, locale, h.at, now)}
                      </span>
                      {h.date ? <span className="hist-detail">{fmtDate(locale, h.date, { weekday: 'short', day: 'numeric', month: 'short' })}</span> : null}
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="muted">{t('planning.history.slotNone')}</p>
              )}
            </section>
          </div>
        </>
      ) : null}
    </Dialog>
  );
}

/** « coach-absent · Mehdi en compétition » → « Coach absent · Mehdi en compétition ». */
export { motifLabel };
