'use client';

import { useEffect, useMemo, useRef, useState, type DragEvent } from 'react';

import { IconAlert, IconCheck, IconClose, IconPhoto, IconShield, IconUpload } from '@/components/icons';
import { Field, Segmented, TextInput } from '@/components/wizard/fields';
import { useI18n } from '@/i18n/client';
import type { MessageKey } from '@/i18n/messages';
import { groupOf, humanSize, PHOTO_GROUPS, readableName, thumbUrl, type PhotoGroup } from '@/lib/content/media';
import { LIMITS, type Library, type Upload } from '@/lib/content/types';
import type { Media } from '@/lib/types';

/**
 * LA PHOTOTHÈQUE des assistants : les photos réelles des clubs (charte : jamais
 * d'image générée) et les dépôts de l'équipe. Une photo choisie porte toujours
 * son texte alternatif ; un dépôt n'en part pas sans lui.
 */
const MAX_BYTES = 8 * 1024 * 1024;
const TYPES = ['image/jpeg', 'image/png', 'image/webp'];

type Pending = { file: File; url: string; alt: string };

export function MediaPicker({
  value,
  onChange,
  library,
  onUploaded,
  errorPhoto,
  errorAlt,
  suggestion,
  field = 'photo',
}: {
  /** Le nom du champ dans l'assistant (« photo », « poster ») : le focus des erreurs le cherche. */
  field?: string;
  value: Media | null;
  onChange: (m: Media | null) => void;
  library: Library;
  onUploaded?: (u: Upload) => void;
  errorPhoto?: string;
  errorAlt?: string;
  /** La photo du club choisi, proposée en un clic. */
  suggestion?: { file: string; label: string };
}) {
  const { t, locale } = useI18n();
  const [tab, setTab] = useState<'library' | 'uploads'>(value?.kind === 'upload' ? 'uploads' : 'library');
  const [group, setGroup] = useState<PhotoGroup | 'all'>('all');
  const [pending, setPending] = useState<Pending | null>(null);
  const [pendingError, setPendingError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [drag, setDrag] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  // L'aperçu local d'un fichier choisi : libéré dès qu'il ne sert plus.
  useEffect(() => () => (pending ? URL.revokeObjectURL(pending.url) : undefined), [pending]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: library.photos.length };
    for (const f of library.photos) c[groupOf(f)] = (c[groupOf(f)] ?? 0) + 1;
    return c;
  }, [library.photos]);
  const photos = group === 'all' ? library.photos : library.photos.filter((f) => groupOf(f) === group);

  const choose = (m: Media) => {
    // Une autre photo : le texte alternatif d'avant ne la décrit plus.
    onChange(value && value.file === m.file && value.kind === m.kind ? value : m);
    setNotice(null);
  };

  const take = (file: File | undefined) => {
    setPendingError(null);
    setNotice(null);
    if (!file) return;
    if (!TYPES.includes(file.type)) return setPendingError(t('medias.err.type'));
    if (file.size > MAX_BYTES) return setPendingError(t('medias.err.size'));
    setPending({ file, url: URL.createObjectURL(file), alt: '' });
    setTab('uploads');
  };

  const send = async () => {
    if (!pending) return;
    if (!pending.alt.trim()) return setPendingError(t('medias.err.alt'));
    setBusy(true);
    setPendingError(null);
    try {
      const body = new FormData();
      body.set('file', pending.file);
      body.set('alt', pending.alt.trim());
      const res = await fetch('/api/admin/media', { method: 'POST', body });
      const data = (await res.json().catch(() => ({}))) as { upload?: Upload; duplicate?: boolean; error?: string };
      if (!res.ok || !data.upload) {
        setPendingError(data.error === 'trop-lourd' ? t('medias.err.size') : data.error === 'pas-une-image' ? t('medias.err.type') : data.error === 'alt' ? t('medias.err.alt') : t('medias.err.network'));
        return;
      }
      onUploaded?.(data.upload);
      onChange({ kind: 'upload', file: data.upload.file, alt: data.upload.alt });
      setNotice(data.duplicate ? t('medias.duplicate') : t('medias.uploaded'));
      setPending(null);
    } catch {
      setPendingError(t('medias.err.network'));
    } finally {
      setBusy(false);
    }
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDrag(false);
    take(e.dataTransfer.files?.[0]);
  };

  const tile = (m: Media, i: number, label: string) => {
    const on = value?.file === m.file && value.kind === m.kind;
    return (
      <button
        key={`${m.kind}:${m.file}`}
        id={i === 0 ? `f-${field}` : undefined}
        type="button"
        className="media-tile"
        aria-pressed={on}
        aria-label={t('medias.pickName', { name: label })}
        title={label}
        onClick={() => choose(m)}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- photothèque locale, servie par /api/media */}
        <img src={thumbUrl(m, 256)} alt="" loading="lazy" decoding="async" />
        {on ? (
          <span className="media-tile-check" aria-hidden="true">
            <IconCheck size={14} />
          </span>
        ) : null}
      </button>
    );
  };

  return (
    <div className="media-picker" data-field={field}>
      <div className="media-current" data-empty={!value || undefined}>
        {value ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element -- aperçu de la photo choisie */}
            <img src={thumbUrl(value, 640)} alt="" className="media-current-img" />
            <div className="stack" style={{ '--gap': '8px', minWidth: 0, flex: 1 } as React.CSSProperties}>
              <div className="row-between">
                <p className="eyebrow">{t('medias.selected')}</p>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => onChange(null)}>
                  <IconClose size={15} />
                  {t('btn.clear')}
                </button>
              </div>
              <p className="mono small dim truncate">{value.kind === 'photo' ? readableName(value.file) : value.file}</p>
              <Field id="alt" label={t('medias.alt')} hint={t('medias.alt.help')} error={errorAlt} counter={{ n: value.alt.length, max: LIMITS.alt }}>
                <TextInput id="alt" value={value.alt} error={errorAlt} hint placeholder={t('medias.alt.placeholder')} maxLength={LIMITS.alt + 20} onChange={(e) => onChange({ ...value, alt: e.target.value })} />
              </Field>
            </div>
          </>
        ) : (
          <div className="row" style={{ '--gap': '12px' } as React.CSSProperties}>
            <span className="media-current-ph" aria-hidden="true">
              <IconPhoto size={22} />
            </span>
            <p className={errorPhoto ? 'field-error' : 'small muted'} id={`f-${field}-err`} role={errorPhoto ? 'alert' : undefined}>
              {errorPhoto ? <IconAlert size={15} /> : null}
              <span>{errorPhoto ?? t('medias.none')}</span>
            </p>
          </div>
        )}
      </div>

      {suggestion && value?.file !== suggestion.file ? (
        <button type="button" className="chip media-suggest" onClick={() => choose({ kind: 'photo', file: suggestion.file, alt: '' })}>
          {/* eslint-disable-next-line @next/next/no-img-element -- vignette de la photo proposée */}
          <img src={thumbUrl({ kind: 'photo', file: suggestion.file }, 128)} alt="" />
          {t('medias.clubPhoto', { club: suggestion.label })}
        </button>
      ) : null}

      {notice ? (
        <p className="small media-notice" role="status">
          <IconCheck size={15} />
          {notice}
        </p>
      ) : null}

      <Segmented
        label={t('medias.tab.library')}
        value={tab}
        onChange={setTab}
        options={[
          { value: 'library', label: `${t('medias.tab.library')} · ${library.photos.length}` },
          { value: 'uploads', label: `${t('medias.tab.uploads')} · ${library.uploads.length}` },
        ]}
      />

      {tab === 'library' ? (
        <>
          <div className="chips" role="group" aria-label={t('medias.tab.library')}>
            {(['all', ...PHOTO_GROUPS] as const).map((g) =>
              counts[g] ? (
                <button key={g} type="button" className="chip" aria-pressed={group === g} onClick={() => setGroup(g)}>
                  {t(`medias.group.${g}` as MessageKey)}
                  <span className="chip-count">{counts[g]}</span>
                </button>
              ) : null,
            )}
          </div>
          <div className="media-grid">{photos.map((f, i) => tile({ kind: 'photo', file: f, alt: '' }, i, readableName(f)))}</div>
        </>
      ) : (
        <>
          <div
            className="media-drop"
            data-drag={drag || undefined}
            onDragOver={(e) => {
              e.preventDefault();
              setDrag(true);
            }}
            onDragLeave={() => setDrag(false)}
            onDrop={onDrop}
          >
            {pending ? (
              <div className="media-pending">
                {/* eslint-disable-next-line @next/next/no-img-element -- aperçu local avant dépôt */}
                <img src={pending.url} alt="" />
                <div className="stack" style={{ '--gap': '10px', minWidth: 0, flex: 1 } as React.CSSProperties}>
                  <p className="small strong truncate">{t('medias.drop.ready', { name: pending.file.name, size: humanSize(pending.file.size, locale) })}</p>
                  <Field id="upload-alt" label={t('medias.alt')} hint={t('medias.alt.help')}>
                    <TextInput id="upload-alt" value={pending.alt} placeholder={t('medias.alt.placeholder')} maxLength={LIMITS.alt} hint onChange={(e) => setPending({ ...pending, alt: e.target.value })} />
                  </Field>
                  <div className="row" style={{ '--gap': '8px' } as React.CSSProperties}>
                    <button type="button" className="btn btn-primary btn-sm" disabled={busy} onClick={() => void send()}>
                      {busy ? <span className="spinner" aria-hidden="true" /> : <IconUpload size={16} />}
                      {busy ? t('medias.uploading') : t('medias.upload')}
                    </button>
                    <button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={() => setPending(null)}>
                      {t('medias.cancel')}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <span className="media-drop-icon" aria-hidden="true">
                  <IconUpload size={22} />
                </span>
                <div className="stack" style={{ '--gap': '4px' } as React.CSSProperties}>
                  <p className="strong">{t('medias.drop.title')}</p>
                  <p className="small muted">{t('medias.drop.sub')}</p>
                </div>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => fileInput.current?.click()}>
                  {t('medias.drop.choose')}
                </button>
                <input ref={fileInput} type="file" accept={TYPES.join(',')} hidden onChange={(e) => take(e.target.files?.[0] ?? undefined)} />
              </>
            )}
            {pendingError ? (
              <p className="field-error" role="alert">
                <IconAlert size={15} />
                <span>{pendingError}</span>
              </p>
            ) : null}
            <p className="small dim media-gps">
              <IconShield size={14} />
              {t('medias.drop.gps')}
            </p>
          </div>
          {library.uploads.length ? <div className="media-grid">{library.uploads.map((u, i) => tile({ kind: 'upload', file: u.file, alt: u.alt }, i, u.alt))}</div> : <p className="small muted">{t('medias.empty.uploads')}</p>}
        </>
      )}
    </div>
  );
}
