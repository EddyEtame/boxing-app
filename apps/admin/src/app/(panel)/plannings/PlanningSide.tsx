'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { takeAppChanges, undoPlanning } from './actions';
import { Dialog } from '@/components/Dialog';
import { IconAlert, IconCheck, IconDatabase, IconRefresh, IconUndo } from '@/components/icons';
import { useToast } from '@/components/Toast';
import { useNow } from '@/components/useNow';
import { useI18n } from '@/i18n/client';
import type { MessageKey } from '@/i18n/messages';
import { CLUB_LABEL } from '@/lib/clubs';
import { fmtDate, fmtDateTime, relative } from '@/lib/format';
import { weekSummary } from '@/lib/planning/hours';
import { heure } from '@/lib/planning/model';
import type { PlanningChange, Slot } from '@/lib/types';

export type SourceView =
  | { kind: 'identique'; path: string; importedAt: string; count: number; local: number }
  | { kind: 'diverge'; path: string; importedAt: string; added: Slot[]; removed: Slot[]; changed: { before: Slot; after: Slot }[]; conflicts: string[]; local: number }
  | { kind: 'illisible'; path: string; error: string };

/**
 * D'OÙ VIENT LE PLANNING — une ligne qui dit si le fichier de l'app est
 * toujours celui qu'on a repris, et sinon ce qui a changé de son côté. Rien ne
 * se reprend tout seul : un changement fait ici ne s'écrase jamais en silence.
 */
export function SourceStrip({ source, canTake }: { source: SourceView; canTake: boolean }) {
  const { t, locale } = useI18n();
  const toast = useToast();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();

  if (source.kind === 'illisible') {
    return (
      <div className="callout" data-kind="neg" role="status">
        <IconAlert />
        <span>
          <span className="callout-title">{t('planning.src.broken')}. </span>
          {t('planning.src.broken.sub', { path: source.path, error: source.error })}
        </span>
      </div>
    );
  }

  if (source.kind === 'identique') {
    return (
      <p className="source-line">
        <IconDatabase size={16} />
        <span>
          {t('planning.src.same', { path: source.path, date: fmtDateTime(locale, source.importedAt), n: source.count })}
          {source.local ? ` · ${t('planning.src.local', { n: source.local })}` : ''}
        </span>
      </p>
    );
  }

  const take = (prefer: 'admin' | 'app') =>
    start(async () => {
      const res = await takeAppChanges(prefer);
      if (!res.ok) {
        toast({ text: t(`err.${res.error}` as MessageKey), kind: 'err' });
        return;
      }
      setOpen(false);
      toast({ text: t('planning.src.taken', { a: res.data.added, r: res.data.removed, c: res.data.changed, k: res.data.kept }), kind: 'ok' });
      router.refresh();
    });

  const line = (s: Slot) => `${CLUB_LABEL[s.club]}${s.espace ? ` (${s.espace})` : ''} · ${t(`planning.dayShort.${s.jour}` as MessageKey)} ${heure(s.debut)}–${heure(s.fin)} · ${s.activite}${s.coach && s.coach !== 'ACCES LIBRE' ? ` · ${s.coach}` : ''}`;

  return (
    <>
      <div className="callout" data-kind="warn" role="status">
        <IconRefresh />
        <span>
          <span className="callout-title">{t('planning.src.diverge')}. </span>
          {t('planning.src.diverge.sub', { a: source.added.length, r: source.removed.length, c: source.changed.length, date: fmtDate(locale, source.importedAt, { day: 'numeric', month: 'long' }) })}
          {source.conflicts.length ? ` ${t('planning.src.conflicts', { n: source.conflicts.length })}` : ''}{' '}
          <button type="button" className="linkish" onClick={() => setOpen(true)}>
            {t('planning.src.see')}
          </button>
        </span>
      </div>
      <Dialog open={open} onClose={() => setOpen(false)} className="modal modal-wide" labelledBy="src-title">
        <div className="modal-head">
          <div>
            <h2 id="src-title" className="modal-title">
              {t('planning.src.title')}
            </h2>
            <p className="modal-sub">{t('planning.src.title.sub', { path: source.path })}</p>
          </div>
        </div>
        <div className="modal-body src-diff">
          {(['added', 'removed', 'changed'] as const).map((k) => {
            const items = k === 'changed' ? source.changed.map((c) => c.after) : source[k];
            return (
              <section key={k}>
                <h3>
                  {t(`planning.src.${k}` as MessageKey)} <span className="muted">· {items.length}</span>
                </h3>
                {items.length ? (
                  <ul>
                    {k === 'changed'
                      ? source.changed.map((c) => (
                          <li key={c.after.id} data-conflict={source.conflicts.includes(c.after.id) || undefined}>
                            <span className="src-before">{line(c.before)}</span>
                            <span className="src-after">→ {line(c.after)}</span>
                            {source.conflicts.includes(c.after.id) ? <span className="tag tag-warn">{t('planning.src.conflict')}</span> : null}
                          </li>
                        ))
                      : items.map((s) => (
                          <li key={s.id} data-conflict={source.conflicts.includes(s.id) || undefined}>
                            {line(s)}
                            {source.conflicts.includes(s.id) ? <span className="tag tag-warn">{t('planning.src.conflict')}</span> : null}
                          </li>
                        ))}
                  </ul>
                ) : (
                  <p className="muted">{t('planning.src.nothing')}</p>
                )}
              </section>
            );
          })}
          {!canTake ? <p className="field-help">{t('planning.src.onlyDirection')}</p> : null}
        </div>
        <div className="modal-foot">
          <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>
            {t('btn.close')}
          </button>
          {canTake ? (
            <>
              <button type="button" className="btn btn-secondary" disabled={pending} onClick={() => take('app')}>
                {t('planning.src.takeAll')}
              </button>
              <button type="button" className="btn btn-primary" disabled={pending} onClick={() => take('admin')}>
                <IconCheck size={16} />
                {t('planning.src.takeKeep')}
              </button>
            </>
          ) : null}
        </div>
      </Dialog>
    </>
  );
}

const UNDOABLE: PlanningChange['kind'][] = ['ajout', 'deplacement', 'suppression', 'annulation', 'fermeture', 'horaires'];

/** Les derniers changements, signés et datés ; le plus récent de chaque cours se défait d'un clic. */
export function HistoryPanel({ history, slots, canEdit }: { history: PlanningChange[]; slots: Slot[]; canEdit: boolean }) {
  const { t, locale } = useI18n();
  const now = useNow();
  const toast = useToast();
  const router = useRouter();
  const [pending, start] = useTransition();
  const undone = new Set(history.map((h) => h.undoOf).filter(Boolean) as string[]);
  const seen = new Set<string>();
  const undoable = new Set<string>();
  // Les horaires : seul le plus récent changement qui touche un club se défait (un changement peut en toucher plusieurs).
  const hoursSeen = new Set<string>();
  for (const h of history) {
    if (h.hours) {
      const clubs = h.clubs ?? [];
      if (h.kind === 'horaires' && !undone.has(h.id) && !clubs.some((c) => hoursSeen.has(c))) undoable.add(h.id);
      for (const c of clubs) hoursSeen.add(c);
      continue;
    }
    const key = h.slotId ?? (h.kind === 'fermeture' ? `fermeture:${h.date}` : null);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    if (UNDOABLE.includes(h.kind) && !undone.has(h.id)) undoable.add(h.id);
  }
  const dayShort = (j: number) => t(`planning.dayShort.${j}` as MessageKey).toLowerCase();
  const label = (h: PlanningChange) => {
    const s = h.after ?? h.before ?? slots.find((x) => x.id === h.slotId);
    if (h.hours) {
      const clubs = h.clubs ?? [];
      const week = clubs.length ? h.hours.after[clubs[0]!] : undefined;
      return `${clubs.map((c) => CLUB_LABEL[c]).join(', ')}${week ? ` · ${weekSummary(week, dayShort, t('planning.hours.closedShort'))}` : ''}`;
    }
    if (h.kind === 'fermeture') return `${(h.clubs ?? []).map((c) => CLUB_LABEL[c]).join(', ')} · ${h.date ? fmtDate(locale, h.date, { weekday: 'short', day: 'numeric', month: 'short' }) : ''} · ${t('planning.sessionsCount', { n: h.exceptionIds?.length ?? 0 })}`;
    if (!s) return h.note ?? '';
    const where = `${s.activite} · ${CLUB_LABEL[s.club]}`;
    if (h.kind === 'deplacement' && h.before && h.after) return `${where} · ${t(`planning.dayShort.${h.before.jour}` as MessageKey)} ${heure(h.before.debut)} → ${t(`planning.dayShort.${h.after.jour}` as MessageKey)} ${heure(h.after.debut)}`;
    if ((h.kind === 'annulation' || h.kind === 'retablissement') && h.date) return `${where} · ${fmtDate(locale, h.date, { weekday: 'short', day: 'numeric', month: 'short' })}`;
    return `${where} · ${t(`planning.dayShort.${s.jour}` as MessageKey)} ${heure(s.debut)}`;
  };
  const undo = (h: PlanningChange) =>
    start(async () => {
      const res = await undoPlanning(h.id);
      if (!res.ok) {
        toast({ text: t(res.error === 'conflit' ? 'planning.undo.conflict' : (`err.${res.error}` as MessageKey)), kind: 'err' });
        return;
      }
      toast({ text: t('planning.undo.done'), kind: 'ok' });
      router.refresh();
    });

  return (
    <section className="panel" aria-labelledby="hist-title">
      <div className="panel-head">
        <div>
          <h3 id="hist-title" className="panel-title">
            {t('planning.history.title')}
          </h3>
          <p className="panel-sub">{t('planning.history.sub')}</p>
        </div>
      </div>
      <div className="panel-body">
        {history.length === 0 ? <p className="muted">{t('planning.history.none')}</p> : null}
        <ol className="hist hist-wide">
          {history.slice(0, 30).map((h) => (
            <li key={h.id} data-kind={h.kind} data-undone={undone.has(h.id) || undefined}>
              <span className="hist-what">{t(`planning.kind.${h.kind}` as MessageKey)}</span>
              <span className="hist-detail">{h.kind === 'import' || h.kind === 'reprise' ? h.note : label(h)}</span>
              <span className="hist-who">
                {h.by} · <time dateTime={h.at}>{relative(t, locale, h.at, now)}</time>
              </span>
              {canEdit && undoable.has(h.id) ? (
                <button type="button" className="btn btn-ghost btn-sm" disabled={pending} onClick={() => undo(h)}>
                  <IconUndo size={15} />
                  {t('planning.undo')}
                </button>
              ) : undone.has(h.id) ? (
                <span className="tag">{t('planning.undone')}</span>
              ) : null}
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
