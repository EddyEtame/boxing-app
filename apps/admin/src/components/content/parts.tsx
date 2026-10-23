'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';

import { Dialog } from '@/components/Dialog';
import { IconBell, IconClose, IconSearch, IconTrash } from '@/components/icons';
import { useI18n } from '@/i18n/client';
import { fmtDateTime } from '@/lib/format';
import type { PublishStatus } from '@/lib/types';

/** Le statut d'un contenu, avec l'heure de mise en ligne quand il est programmé. */
export function StatusTag({ status, publishAt }: { status: PublishStatus; publishAt?: string }) {
  const { t, locale } = useI18n();
  if (status === 'programme' && publishAt) {
    return (
      <span className="tag tag-warn" title={fmtDateTime(locale, publishAt)}>
        <span className="dot" aria-hidden="true" style={{ background: 'currentColor' }} />
        {t('contenu.state.scheduled', { when: fmtDateTime(locale, publishAt) })}
      </span>
    );
  }
  const cls = status === 'publie' ? 'tag tag-pos' : status === 'archive' ? 'tag ct-tag-archive' : 'tag';
  return (
    <span className={cls}>
      {status === 'publie' ? <span className="dot" aria-hidden="true" style={{ background: 'currentColor' }} /> : null}
      {t(`state.${status}`)}
    </span>
  );
}

/** Le champ de recherche des listes, avec sa croix pour repartir de zéro. */
export function SearchBox({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  const { t } = useI18n();
  return (
    <div className="input-group ct-search">
      <IconSearch size={18} />
      <input className="input" type="search" value={value} onChange={(e) => onChange(e.target.value)} placeholder={label} aria-label={label} />
      {value ? (
        <button type="button" className="btn btn-ghost btn-sm btn-icon input-action" onClick={() => onChange('')} aria-label={t('contenu.search.clear')}>
          <IconClose size={16} />
        </button>
      ) : null}
    </div>
  );
}

/** Après la publication d'un contenu important : le relais vers la notification (CDC §8). */
export function HandoffBanner({ title, href, onClose, headline }: { title: string; href: string; onClose: () => void; headline?: string }) {
  const { t } = useI18n();
  return (
    <div className="callout ct-handoff" role="status">
      <IconBell />
      <div className="stack" style={{ '--gap': '10px', flex: 1 } as React.CSSProperties}>
        <span>
          <span className="callout-title">{headline ?? t('contenu.handoff.title', { title })} </span>
          {t('contenu.handoff.text')}
        </span>
        <div className="row" style={{ '--gap': '8px' } as React.CSSProperties}>
          <Link className="btn btn-bell btn-sm" href={href}>
            <IconBell size={16} />
            {t('contenu.handoff.go')}
          </Link>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>
            {t('contenu.handoff.later')}
          </button>
        </div>
      </div>
    </div>
  );
}

/** La confirmation d'une suppression : elle dit ce qui se perd, et ce qui se rattrape. */
export function ConfirmDelete({ count, open, onClose, onConfirm }: { count: number; open: boolean; onClose: () => void; onConfirm: () => void }) {
  const { t } = useI18n();
  return (
    <Dialog open={open} onClose={onClose} className="modal" labelledBy="ct-del-title">
      <div className="modal-head">
        <h2 id="ct-del-title" className="modal-title">
          {t('contenu.del.title', { n: count })}
        </h2>
      </div>
      <p className="modal-body">{t('contenu.del.body')}</p>
      <div className="modal-foot">
        <button type="button" className="btn btn-ghost" onClick={onClose}>
          {t('btn.cancel')}
        </button>
        <button type="button" className="btn btn-danger" onClick={onConfirm}>
          <IconTrash size={16} />
          {t('btn.delete')}
        </button>
      </div>
    </Dialog>
  );
}

/** Une ligne de comptes au-dessus d'une liste : « 12 vidéos · 4 gratuites · 3 sans fichier ». */
export function Summary({ items }: { items: { key: string; node: ReactNode }[] }) {
  return (
    <p className="ct-summary small">
      {items.map((i, n) => (
        <span key={i.key}>
          {n > 0 ? <span className="ct-sep" aria-hidden="true" /> : null}
          {i.node}
        </span>
      ))}
    </p>
  );
}
