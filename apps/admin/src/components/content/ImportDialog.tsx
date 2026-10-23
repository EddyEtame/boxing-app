'use client';

import { useMemo, useState } from 'react';

import { Dialog } from '@/components/Dialog';
import { IconAlert, IconDownload, IconInfo } from '@/components/icons';
import { useI18n } from '@/i18n/client';
import type { MessageKey } from '@/i18n/messages';
import { thumbUrl } from '@/lib/content/media';
import type { ImportPreview } from '@/lib/content/types';

/**
 * « Reprendre le contenu de l'app » : la liste de ce que l'app montre
 * aujourd'hui depuis son code, à cocher. Ce qui est déjà repris est grisé ;
 * ce que la reprise laisse de côté est dit, avec la raison.
 */
export function ImportDialog({ open, onClose, preview, onImport }: { open: boolean; onClose: () => void; preview: ImportPreview; onImport: (ids: string[]) => Promise<void> }) {
  const { t } = useI18n();
  const fresh = useMemo(() => preview.candidates.filter((c) => !c.already).map((c) => c.id), [preview]);
  const [picked, setPicked] = useState<Set<string>>(() => new Set(fresh));
  const [busy, setBusy] = useState(false);
  const allOn = fresh.length > 0 && fresh.every((id) => picked.has(id));

  return (
    <Dialog open={open} onClose={() => !busy && onClose()} className="modal ct-import" labelledBy="ct-import-title">
      <div className="modal-head">
        <div className="stack" style={{ '--gap': '6px' } as React.CSSProperties}>
          <p className="eyebrow">{t('contenu.import.menu')}</p>
          <h2 id="ct-import-title" className="modal-title">
            {t('contenu.import.title')}
          </h2>
        </div>
      </div>
      <div className="modal-body stack" style={{ '--gap': '14px' } as React.CSSProperties}>
        <p>{t('contenu.import.lead', { path: preview.path })}</p>
        {preview.error ? (
          <div className="callout" data-kind="neg" role="alert">
            <IconAlert />
            <span>{t('contenu.import.error', { why: preview.error })}</span>
          </div>
        ) : null}
        {preview.notes.map((n) => (
          <div key={n.key} className="callout" role="note">
            <IconInfo />
            <span>{t(n.key as MessageKey, n.vars)}</span>
          </div>
        ))}
        {preview.candidates.length ? (
          <>
            {fresh.length > 1 ? (
              <label className="row ct-import-all">
                <input type="checkbox" className="tbl-check" checked={allOn} onChange={() => setPicked(allOn ? new Set() : new Set(fresh))} />
                <span className="small strong">{t('contenu.import.selectAll')}</span>
              </label>
            ) : null}
            <ul className="ct-import-list">
              {preview.candidates.map((c) => (
                <li key={c.id}>
                  <label data-off={c.already || undefined}>
                    <input
                      type="checkbox"
                      className="tbl-check"
                      checked={c.already || picked.has(c.id)}
                      disabled={c.already}
                      onChange={() =>
                        setPicked((prev) => {
                          const next = new Set(prev);
                          if (next.has(c.id)) next.delete(c.id);
                          else next.add(c.id);
                          return next;
                        })
                      }
                    />
                    {c.photo ? (
                      // eslint-disable-next-line @next/next/no-img-element -- photothèque locale
                      <img src={thumbUrl({ kind: 'photo', file: c.photo }, 128)} alt="" />
                    ) : (
                      <span className="ct-import-ph" />
                    )}
                    <span className="ct-import-text">
                      <b>{c.title}</b>
                      <span>{c.sub}</span>
                    </span>
                    <span className={c.already ? 'tag' : 'tag tag-pos'}>{c.already ? t('contenu.import.already') : t(c.target as MessageKey)}</span>
                  </label>
                </li>
              ))}
            </ul>
          </>
        ) : !preview.error && preview.kind !== 'event' ? (
          <p className="small muted">{t('contenu.import.none')}</p>
        ) : null}
      </div>
      <div className="modal-foot">
        <button type="button" className="btn btn-ghost" onClick={onClose} disabled={busy}>
          {preview.candidates.length ? t('btn.cancel') : t('btn.close')}
        </button>
        {preview.candidates.length ? (
          <button
            type="button"
            className="btn btn-primary"
            disabled={busy || picked.size === 0}
            onClick={async () => {
              setBusy(true);
              try {
                await onImport([...picked]);
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? <span className="spinner" aria-hidden="true" /> : <IconDownload size={16} />}
            {t('contenu.import.go', { n: picked.size })}
          </button>
        ) : null}
      </div>
    </Dialog>
  );
}
