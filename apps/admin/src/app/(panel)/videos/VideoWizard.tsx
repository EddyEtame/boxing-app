'use client';

import { discipline } from '@bc/brand';
import Link from 'next/link';

import { saveVideoAction, type SavedVideo } from './actions';
import { translateErrors } from '@/components/content/errors';
import { niveauKey, objectifKey, PreviewPane, VideoPhone } from '@/components/content/Previews';
import { PublishFields, TypoNote } from '@/components/content/PublishFields';
import { IconInfo, IconLock, IconPlay, IconPlug } from '@/components/icons';
import { MediaPicker } from '@/components/media/MediaPicker';
import { Choices, Chips, Field, Review, Segmented, Switch, TextInput } from '@/components/wizard/fields';
import { Wizard, type WizardStep } from '@/components/wizard/Wizard';
import { frTypo } from '@/i18n/core';
import { useI18n } from '@/i18n/client';
import type { MessageKey } from '@/i18n/messages';
import { VIDEO_FAMILLES } from '@/lib/content/enums';
import { checkVideo, pick, stepOfField } from '@/lib/content/rules';
import { LIMITS, type Library, type Upload, type VideoDraft, type VideoSourceKind } from '@/lib/content/types';
import { NIVEAUX, OBJECTIFS, SECURITES, type Niveau, type Objectif, type Securite } from '@/lib/types';

const FIELDS: Record<string, string[]> = {
  discipline: ['famille'],
  contenu: ['title', 'coach', 'numero'],
  reglages: ['niveau', 'dureeMin', 'objectif', 'securite'],
  source: ['sourceRef'],
  vignette: ['poster', 'alt'],
  acces: [],
  publication: ['mode'],
};

export function VideoWizard({
  open,
  onClose,
  initial,
  wasPublished,
  library,
  onUploaded,
  takenNumbers,
  coaches,
  freeCount,
  total,
  streamConfigured,
  onSaved,
  onUndo,
}: {
  open: boolean;
  onClose: () => void;
  initial: VideoDraft;
  wasPublished: boolean;
  library: Library;
  onUploaded: (u: Upload) => void;
  /** Les numéros déjà pris par les autres vidéos. */
  takenNumbers: number[];
  coaches: string[];
  freeCount: number;
  total: number;
  streamConfigured: boolean;
  onSaved: (saved: SavedVideo) => void;
  onUndo: (token: string) => Promise<void>;
}) {
  const { t } = useI18n();
  const editing = Boolean(initial.id);
  const errs = (step: string) => (s: VideoDraft) => translateErrors(t, pick(checkVideo(s, takenNumbers), FIELDS[step]!));
  const num = (v: string) => (v.trim() === '' ? Number.NaN : Math.round(Number(v)));

  const steps: WizardStep<VideoDraft>[] = [
    {
      id: 'discipline',
      title: t('vid.step.discipline'),
      hint: t('vid.step.discipline.hint'),
      validate: errs('discipline'),
      render: ({ state, set }) => (
        <Choices
          name="famille"
          value={state.famille}
          min={220}
          onChange={(v) => set({ famille: v })}
          options={VIDEO_FAMILLES.map((f) => ({
            value: f,
            title: t(`vid.famille.${f}` as MessageKey),
            sub: t(`vid.famille.${f}.sub` as MessageKey),
            icon: <span className="ct-swatch" style={{ background: discipline[f], width: 16, height: 16 }} aria-hidden="true" />,
          }))}
        />
      ),
    },
    {
      id: 'contenu',
      title: t('vid.step.contenu'),
      hint: t('vid.step.contenu.hint'),
      validate: errs('contenu'),
      render: ({ state, set, errors }) => (
        <>
          <Field id="title" label={t('vid.f.title')} hint={t('vid.f.title.help')} error={errors.title} counter={{ n: state.title.trim().length, max: LIMITS.videoTitle }}>
            <TextInput id="title" value={state.title} error={errors.title} hint maxLength={LIMITS.videoTitle + 20} onChange={(e) => set({ title: e.target.value })} />
          </Field>
          <div className="form-grid ct-grid">
            <Field id="coach" label={t('vid.f.coach')} hint={t('vid.f.coach.help')} error={errors.coach} optional>
              <TextInput id="coach" list="ct-coaches" value={state.coach} error={errors.coach} hint maxLength={LIMITS.coach + 10} onChange={(e) => set({ coach: e.target.value })} />
              <datalist id="ct-coaches">
                {coaches.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </Field>
            <Field id="numero" label={t('vid.f.numero')} hint={t('vid.f.numero.help')} error={errors.numero}>
              <TextInput id="numero" type="number" inputMode="numeric" min={1} max={999} value={Number.isNaN(state.numero) ? '' : state.numero} error={errors.numero} hint style={{ maxWidth: 140 }} onChange={(e) => set({ numero: num(e.target.value) })} />
            </Field>
          </div>
          <TypoNote texts={[state.title]} />
        </>
      ),
    },
    {
      id: 'reglages',
      title: t('vid.step.reglages'),
      hint: t('vid.step.reglages.hint'),
      validate: errs('reglages'),
      render: ({ state, set, errors }) => (
        <>
          <Field id="niveau" label={t('vid.f.niveau')} error={errors.niveau}>
            <Segmented<Niveau> label={t('vid.f.niveau')} value={state.niveau} onChange={(v) => set({ niveau: v })} options={NIVEAUX.map((n) => ({ value: n, label: t(niveauKey(n)) }))} />
          </Field>
          <Field id="dureeMin" label={t('vid.f.duree')} hint={t('vid.f.duree.help')} error={errors.dureeMin}>
            <div className="row" style={{ '--gap': '10px' } as React.CSSProperties}>
              <TextInput id="dureeMin" type="number" inputMode="numeric" min={1} max={180} value={Number.isNaN(state.dureeMin) ? '' : state.dureeMin} error={errors.dureeMin} hint style={{ maxWidth: 120 }} onChange={(e) => set({ dureeMin: num(e.target.value) })} />
              <span className="small muted">min</span>
            </div>
          </Field>
          <Field id="objectif" label={t('vid.f.objectif')} error={errors.objectif}>
            <Chips<Objectif> id="objectif" single values={state.objectif ? [state.objectif] : []} onChange={(v) => set({ objectif: v[0] ?? null })} options={OBJECTIFS.map((o) => ({ value: o, label: t(objectifKey(o)) }))} />
          </Field>
          <Field id="securite" label={t('vid.f.securite')} hint={t('vid.f.securite.help')} error={errors.securite}>
            <Choices<Securite> name="securite" value={state.securite} min={200} onChange={(v) => set({ securite: v })} options={SECURITES.map((s) => ({ value: s, title: t(`vid.sec.${s}` as MessageKey), sub: t(`vid.sec.${s}.sub` as MessageKey) }))} />
          </Field>
        </>
      ),
    },
    {
      id: 'source',
      title: t('vid.step.source'),
      hint: t('vid.step.source.hint'),
      validate: errs('source'),
      render: ({ state, set, errors }) => (
        <>
          <Field id="sourceKind" label={t('vid.f.sourceKind')}>
            <Choices<VideoSourceKind>
              name="sourceKind"
              value={state.sourceKind}
              min={200}
              onChange={(v) => set((s) => ({ sourceKind: v, mode: v === 'aucune' ? 'brouillon' : s.mode }))}
              options={(['stream', 'url', 'aucune'] as const).map((k) => ({ value: k, title: t(`vid.src.${k}`), sub: t(`vid.src.${k}.sub`) }))}
            />
          </Field>
          {state.sourceKind === 'stream' ? (
            <>
              <Field id="sourceRef" label={t('vid.f.streamId')} hint={t('vid.f.streamId.help')} error={errors.sourceRef}>
                <TextInput id="sourceRef" className="input mono" value={state.sourceRef} error={errors.sourceRef} hint spellCheck={false} autoComplete="off" maxLength={64} onChange={(e) => set({ sourceRef: e.target.value.trim() })} />
              </Field>
              {!streamConfigured ? (
                <div className="callout" data-kind="warn" role="note">
                  <IconPlug />
                  <div className="stack" style={{ '--gap': '8px' } as React.CSSProperties}>
                    <span>{t('vid.stream.off')}</span>
                    <Link className="link small strong" href="/branchements">
                      {t('vid.stream.link')}
                    </Link>
                  </div>
                </div>
              ) : null}
            </>
          ) : state.sourceKind === 'url' ? (
            <Field id="sourceRef" label={t('vid.f.url')} error={errors.sourceRef}>
              <TextInput id="sourceRef" type="url" inputMode="url" placeholder="https://" value={state.sourceRef} error={errors.sourceRef} onChange={(e) => set({ sourceRef: e.target.value })} />
            </Field>
          ) : (
            <div className="callout" role="note">
              <IconInfo />
              <span>{t('vid.src.aucune.sub')}</span>
            </div>
          )}
        </>
      ),
    },
    {
      id: 'vignette',
      title: t('vid.step.vignette'),
      hint: t('vid.step.vignette.hint'),
      validate: errs('vignette'),
      render: ({ state, set, errors }) => <MediaPicker field="poster" value={state.poster} onChange={(poster) => set({ poster })} library={library} onUploaded={onUploaded} errorPhoto={errors.poster} errorAlt={errors.alt} />,
    },
    {
      id: 'acces',
      title: t('vid.step.acces'),
      hint: t('vid.step.acces.hint'),
      render: ({ state, set }) => (
        <>
          <div className="card card-pad row ct-switch-card">
            <Switch id="gratuite" checked={state.gratuite} onChange={(v) => set({ gratuite: v })} label={t('vid.f.gratuite')} />
            <div className="stack" style={{ '--gap': '4px' } as React.CSSProperties}>
              <p className="strong row" style={{ '--gap': '6px' } as React.CSSProperties}>
                {state.gratuite ? <IconPlay size={16} /> : <IconLock size={16} />}
                {state.gratuite ? t('vid.acces.free') : t('vid.acces.members')}
              </p>
              <p className="small muted">{state.gratuite ? t('vid.gratuite.on') : t('vid.gratuite.off')}</p>
            </div>
          </div>
          <p className="small dim">{t('vid.gratuite.count', { n: freeCount })}</p>
        </>
      ),
    },
    {
      id: 'publication',
      title: t('contenu.step.publication'),
      hint: t('vid.step.publication.hint'),
      validate: errs('publication'),
      render: ({ state, set, errors }) => (
        <PublishFields
          mode={state.mode}
          date=""
          time=""
          allowSchedule={false}
          onChange={(p) => {
            if (p.mode === 'publie' || p.mode === 'brouillon') set({ mode: p.mode });
          }}
          errors={errors}
          wasPublished={wasPublished}
        />
      ),
    },
    {
      id: 'relire',
      title: t('contenu.step.relire'),
      hint: t('wiz.reviewShort'),
      lead: t('wiz.reviewHint'),
      render: ({ state, goTo }) => (
        <>
          <Review
            goTo={goTo}
            rows={[
              { label: t('vid.r.discipline'), step: 'discipline', value: state.famille ? t(`vid.famille.${state.famille}` as MessageKey) : '—' },
              { label: t('vid.r.title'), step: 'contenu', value: <span className="strong">{frTypo(state.title.trim())}</span> },
              { label: t('vid.r.coach'), step: 'contenu', value: state.coach.trim() || t('contenu.r.none') },
              { label: t('vid.r.numero'), step: 'contenu', value: Number.isNaN(state.numero) ? '—' : `n° ${state.numero}` },
              { label: t('vid.r.reglages'), step: 'reglages', value: [t(niveauKey(state.niveau)), Number.isNaN(state.dureeMin) ? null : t('vid.minutes', { n: state.dureeMin }), state.objectif ? t(objectifKey(state.objectif)) : null].filter(Boolean).join(' · ') },
              { label: t('vid.r.securite'), step: 'reglages', value: state.securite ? t(`vid.sec.${state.securite}` as MessageKey) : '—' },
              { label: t('vid.r.source'), step: 'source', value: state.sourceKind === 'aucune' ? t('vid.src.aucune') : `${t(`vid.src.${state.sourceKind}`)} · ${state.sourceRef}` },
              { label: t('contenu.r.photo'), step: 'vignette', value: state.poster ? state.poster.alt || state.poster.file : '—' },
              { label: t('vid.r.acces'), step: 'acces', value: state.gratuite ? t('vid.acces.free') : t('vid.acces.members') },
              { label: t('contenu.r.publication'), step: 'publication', value: state.mode === 'publie' ? (wasPublished ? t('contenu.r.pub.keep') : t('contenu.r.pub.now')) : t('contenu.r.pub.draft') },
            ]}
          />
          <TypoNote texts={[state.title]} />
        </>
      ),
    },
  ];

  return (
    <Wizard<VideoDraft>
      open={open}
      onClose={onClose}
      kicker={t('vid.wiz.kicker')}
      title={editing ? t('vid.wiz.edit') : t('vid.wiz.new')}
      icon={<IconPlay size={22} />}
      steps={steps}
      initial={initial}
      draftKey={editing ? `vid-${initial.id}` : 'vid-nouvelle'}
      submitLabel={(d) => (editing ? t('contenu.submit.save') : d.mode === 'publie' ? t('contenu.submit.publie') : t('contenu.submit.brouillon'))}
      preview={(state) => (
        <PreviewPane>
          {(scheme) => (
            <VideoPhone
              scheme={scheme}
              count={editing ? total : total + 1}
              item={{ title: frTypo(state.title), famille: state.famille, niveau: state.niveau, dureeMin: state.dureeMin, objectif: state.objectif, securite: state.securite, gratuite: state.gratuite, poster: state.poster }}
            />
          )}
        </PreviewPane>
      )}
      onSubmit={async (state) => {
        const res = await saveVideoAction(state);
        if (!res.ok) {
          const fields = res.fieldErrors ? translateErrors(t, res.fieldErrors) : undefined;
          const first = res.fieldErrors ? Object.keys(res.fieldErrors)[0] : undefined;
          return { ok: false, error: t(`err.${res.error}` as MessageKey), fieldErrors: fields, step: first ? stepOfField(FIELDS, first) : undefined };
        }
        onSaved(res.data);
        const d = res.data;
        const message = !d.created ? t('vid.saved.edit') : d.status === 'brouillon' ? t('vid.saved.brouillon') : t('vid.saved.publie');
        return { ok: true, message, undo: () => onUndo(d.undo) };
      }}
    />
  );
}
