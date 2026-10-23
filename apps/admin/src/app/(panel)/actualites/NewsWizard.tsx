'use client';

import { saveNewsAction, type SavedNews } from './actions';
import { translateErrors } from '@/components/content/errors';
import { NewsPhone, PreviewPane, type NewsLike } from '@/components/content/Previews';
import { DiffusionFields, PublishFields, TypoNote } from '@/components/content/PublishFields';
import { IconNews } from '@/components/icons';
import { MediaPicker } from '@/components/media/MediaPicker';
import { Choices, Field, Review, TextArea, TextInput } from '@/components/wizard/fields';
import { Wizard, type WizardStep } from '@/components/wizard/Wizard';
import { frTypo } from '@/i18n/core';
import { useI18n } from '@/i18n/client';
import type { MessageKey } from '@/i18n/messages';
import { CLUB_LABEL, CLUB_PHOTO } from '@/lib/clubs';
import { checkNews, fmtWall, parisToInstant, pick, stepOfField } from '@/lib/content/rules';
import { LIMITS, type Library, type NewsDraft, type Upload } from '@/lib/content/types';
import { fmtDateTime } from '@/lib/format';
import { NEWS_KINDS, type ClubId } from '@/lib/types';

/** Les champs de chaque étape : une erreur rendue par le serveur rouvre la bonne. */
const FIELDS: Record<string, string[]> = {
  type: ['kind'],
  texte: ['title', 'body', 'date'],
  diffusion: ['club', 'audience'],
  photo: ['photo', 'alt'],
  lien: ['video', 'linkUrl', 'linkLabel'],
  publication: ['mode', 'publishDate', 'publishTime'],
};

export function NewsWizard({
  open,
  onClose,
  initial,
  wasPublished,
  library,
  onUploaded,
  scope,
  others,
  onSaved,
  onUndo,
}: {
  open: boolean;
  onClose: () => void;
  initial: NewsDraft;
  wasPublished: boolean;
  library: Library;
  onUploaded: (u: Upload) => void;
  scope: ClubId[] | 'all';
  others: NewsLike[];
  onSaved: (saved: SavedNews) => void;
  onUndo: (token: string) => Promise<void>;
}) {
  const { t, locale } = useI18n();
  const editing = Boolean(initial.id);
  const errs = (step: string) => (s: NewsDraft) => translateErrors(t, pick(checkNews(s, Date.now()), FIELDS[step]!));

  const steps: WizardStep<NewsDraft>[] = [
    {
      id: 'type',
      title: t('actu.step.type'),
      hint: t('actu.step.type.hint'),
      validate: errs('type'),
      render: ({ state, set }) => (
        <Choices
          name="kind"
          value={state.kind}
          min={220}
          onChange={(v) => set({ kind: v })}
          options={NEWS_KINDS.map((k) => ({ value: k, title: t(`actu.kind.${k}` as MessageKey), sub: t(`actu.kind.${k}.sub` as MessageKey) }))}
        />
      ),
    },
    {
      id: 'texte',
      title: t('actu.step.texte'),
      hint: t('actu.step.texte.hint'),
      validate: errs('texte'),
      render: ({ state, set, errors }) => (
        <>
          <Field id="title" label={t('actu.f.title')} hint={t('actu.f.title.help')} error={errors.title} counter={{ n: state.title.trim().length, max: LIMITS.newsTitle }}>
            <TextInput id="title" value={state.title} error={errors.title} hint maxLength={LIMITS.newsTitle + 30} onChange={(e) => set({ title: e.target.value })} />
          </Field>
          <Field id="body" label={t('actu.f.body')} hint={t('actu.f.body.help')} error={errors.body} counter={{ n: state.body.trim().length, max: LIMITS.newsBody }}>
            <TextArea id="body" rows={8} value={state.body} error={errors.body} hint onChange={(e) => set({ body: e.target.value })} />
          </Field>
          <Field id="date" label={t('actu.f.date')} hint={t('actu.f.date.help')} error={errors.date}>
            <TextInput id="date" type="date" value={state.date} error={errors.date} hint style={{ maxWidth: 220 }} onChange={(e) => set({ date: e.target.value })} />
          </Field>
          <TypoNote texts={[state.title, state.body]} />
        </>
      ),
    },
    {
      id: 'diffusion',
      title: t('contenu.step.diffusion'),
      hint: t('contenu.step.diffusion.hint'),
      validate: errs('diffusion'),
      render: ({ state, set, errors }) => <DiffusionFields club={state.club} audience={state.audience} important={state.important} onChange={set} errors={errors} scope={scope} />,
    },
    {
      id: 'photo',
      title: t('contenu.step.photo'),
      hint: t('contenu.step.photo.hint'),
      validate: errs('photo'),
      render: ({ state, set, errors }) => (
        <MediaPicker
          value={state.photo}
          onChange={(photo) => set({ photo })}
          library={library}
          onUploaded={onUploaded}
          errorPhoto={errors.photo}
          errorAlt={errors.alt}
          suggestion={state.club !== 'reseau' ? { file: CLUB_PHOTO[state.club], label: CLUB_LABEL[state.club] } : undefined}
        />
      ),
    },
    {
      id: 'lien',
      title: t('actu.step.lien'),
      hint: t('actu.step.lien.hint'),
      validate: errs('lien'),
      render: ({ state, set, errors }) => (
        <>
          <Field id="video" label={t('actu.f.video')} hint={t('actu.f.video.help')} error={errors.video} optional>
            <TextInput id="video" type="url" inputMode="url" placeholder="https://" value={state.video} error={errors.video} hint onChange={(e) => set({ video: e.target.value })} />
          </Field>
          <div className="card card-pad stack" style={{ '--gap': '14px' } as React.CSSProperties}>
            <Field id="linkUrl" label={t('actu.f.linkUrl')} hint={t('actu.f.linkUrl.help')} error={errors.linkUrl} optional>
              <TextInput id="linkUrl" type="url" inputMode="url" placeholder="https://" value={state.linkUrl} error={errors.linkUrl} hint onChange={(e) => set({ linkUrl: e.target.value })} />
            </Field>
            <Field id="linkLabel" label={t('actu.f.linkLabel')} error={errors.linkLabel} counter={state.linkLabel ? { n: state.linkLabel.trim().length, max: LIMITS.linkLabel } : undefined}>
              <TextInput id="linkLabel" value={state.linkLabel} error={errors.linkLabel} maxLength={LIMITS.linkLabel + 10} onChange={(e) => set({ linkLabel: e.target.value })} />
            </Field>
            <div className="chips" role="group" aria-label={t('actu.f.linkLabel')}>
              {(['s1', 's2', 's3', 's4'] as const).map((k) => {
                const label = t(`actu.link.${k}`);
                return (
                  <button key={k} type="button" className="chip ct-chip-sm" aria-pressed={state.linkLabel === label} onClick={() => set({ linkLabel: label })}>
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      ),
    },
    {
      id: 'publication',
      title: t('contenu.step.publication'),
      hint: t('contenu.step.publication.hint'),
      validate: errs('publication'),
      render: ({ state, set, errors }) => <PublishFields mode={state.mode} date={state.publishDate} time={state.publishTime} onChange={set} errors={errors} wasPublished={wasPublished} />,
    },
    {
      id: 'relire',
      title: t('contenu.step.relire'),
      hint: t('wiz.reviewShort'),
      lead: t('wiz.reviewHint'),
      render: ({ state, goTo }) => {
        const at = state.mode === 'programme' ? parisToInstant(state.publishDate, state.publishTime) : null;
        const pub =
          state.mode === 'publie' ? (wasPublished ? t('contenu.r.pub.keep') : t('contenu.r.pub.now')) : state.mode === 'brouillon' ? t('contenu.r.pub.draft') : t('contenu.r.pub.later', { when: at ? fmtDateTime(locale, at.toISOString()) : '—' });
        return (
          <>
            <Review
              goTo={goTo}
              rows={[
                { label: t('actu.r.type'), step: 'type', value: state.kind ? t(`actu.kind.${state.kind}` as MessageKey) : '—' },
                { label: t('actu.r.texte'), step: 'texte', value: <span className="strong">{frTypo(state.title.trim())}</span> },
                { label: t('actu.r.body'), step: 'texte', value: <span className="ct-review-body">{frTypo(state.body.trim())}</span> },
                { label: t('actu.r.date'), step: 'texte', value: state.date ? fmtWall(locale, state.date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : '—' },
                { label: t('contenu.r.club'), step: 'diffusion', value: state.club === 'reseau' ? t('club.all') : CLUB_LABEL[state.club] },
                { label: t('contenu.r.audience'), step: 'diffusion', value: t(`audience.${state.audience}`) },
                { label: t('contenu.r.important'), step: 'diffusion', value: state.important ? t('contenu.r.important.yes') : t('contenu.r.important.no') },
                { label: t('contenu.r.photo'), step: 'photo', value: state.photo ? state.photo.alt || state.photo.file : '—' },
                { label: t('actu.r.video'), step: 'lien', value: state.video.trim() || t('contenu.r.none') },
                { label: t('actu.r.link'), step: 'lien', value: state.linkUrl.trim() ? `${state.linkLabel.trim()} → ${state.linkUrl.trim()}` : t('contenu.r.none') },
                { label: t('contenu.r.publication'), step: 'publication', value: pub },
              ]}
            />
            <TypoNote texts={[state.title, state.body, state.linkLabel]} />
          </>
        );
      },
    },
  ];

  return (
    <Wizard<NewsDraft>
      open={open}
      onClose={onClose}
      kicker={t('actu.wiz.kicker')}
      title={editing ? t('actu.wiz.edit') : t('actu.wiz.new')}
      icon={<IconNews size={22} />}
      steps={steps}
      initial={initial}
      draftKey={editing ? `actu-${initial.id}` : 'actu-nouvelle'}
      submitLabel={(d) => (editing ? t('contenu.submit.save') : d.mode === 'publie' ? t('contenu.submit.publie') : d.mode === 'programme' ? t('contenu.submit.programme') : t('contenu.submit.brouillon'))}
      preview={(state) => (
        <PreviewPane>
          {(scheme) => (
            <NewsPhone
              scheme={scheme}
              item={{ kind: state.kind, title: frTypo(state.title), body: frTypo(state.body), date: state.date, club: state.club === 'reseau' ? null : state.club, photo: state.photo, link: state.linkUrl.trim() ? { url: state.linkUrl, label: state.linkLabel } : null }}
              others={others}
            />
          )}
        </PreviewPane>
      )}
      onSubmit={async (state) => {
        const res = await saveNewsAction(state);
        if (!res.ok) {
          const fields = res.fieldErrors ? translateErrors(t, res.fieldErrors) : undefined;
          const first = res.fieldErrors ? Object.keys(res.fieldErrors)[0] : undefined;
          return { ok: false, error: t(`err.${res.error}` as MessageKey), fieldErrors: fields, step: first ? stepOfField(FIELDS, first) : undefined };
        }
        onSaved(res.data);
        const d = res.data;
        const message = !d.created
          ? t('actu.saved.edit')
          : d.status === 'programme' && d.publishAt
            ? t('actu.saved.programme', { when: fmtDateTime(locale, d.publishAt) })
            : d.status === 'brouillon'
              ? t('actu.saved.brouillon')
              : t('actu.saved.publie');
        return { ok: true, message, undo: () => onUndo(d.undo) };
      }}
    />
  );
}
