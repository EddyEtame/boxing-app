'use client';

import { saveEventAction, type SavedEvent } from './actions';
import { translateErrors } from '@/components/content/errors';
import { EventPhone, PreviewPane } from '@/components/content/Previews';
import { DiffusionFields, PublishFields, TypoNote } from '@/components/content/PublishFields';
import { IconAlert, IconInfo, IconLink, IconTicket } from '@/components/icons';
import { MediaPicker } from '@/components/media/MediaPicker';
import { Choices, Field, Review, Select, Switch, TextArea, TextInput } from '@/components/wizard/fields';
import { Wizard, type WizardStep } from '@/components/wizard/Wizard';
import { frTypo } from '@/i18n/core';
import { useI18n } from '@/i18n/client';
import type { MessageKey } from '@/i18n/messages';
import { CLUB_IDS, CLUB_LABEL, CLUB_PHOTO } from '@/lib/clubs';
import { checkEvent, fightAllowed, fightRequired, fmtWall, parisToInstant, pick, stepOfField, wallNowParis } from '@/lib/content/rules';
import { LIMITS, type EventDraft, type Library, type Upload } from '@/lib/content/types';
import { fmtDateTime } from '@/lib/format';
import { EVENT_KINDS, type ClubId } from '@/lib/types';

const BOUTIQUE = 'https://boutique.boxingcenter.fr/';

const FIELDS: Record<string, string[]> = {
  type: ['kind'],
  infos: ['title', 'body'],
  quand: ['startDate', 'startTime', 'endDate', 'endTime', 'club', 'venue'],
  combat: ['fighter', 'opponent', 'weightClass', 'beltTitle', 'broadcaster'],
  billetterie: ['ticketUrl'],
  photo: ['photo', 'alt'],
  publication: ['audience', 'mode', 'publishDate', 'publishTime'],
};

/** Le combat montré sur la carte : obligatoire pour un combat, au choix pour un gala. */
const showsFight = (s: EventDraft) => fightRequired(s) || (fightAllowed(s) && s.withFight);

/** « 18:30 » → « 18h30 », « 09:00 » → « 9h » (l'écriture des affiches du club). */
const hFr = (hm: string) => hm.replace(/^0/, '').replace(':', 'h').replace(/h00$/, 'h');

/** « sam. 14 nov. · 19h – 23h30 » dans une liste ; « samedi 14 novembre · 19h – 23h30 » à la relecture. */
export function whenLabel(locale: 'fr' | 'en', startsAt: string, endsAt?: string | null, style: 'short' | 'long' = 'long'): string {
  const day = (w: string) => fmtWall(locale, w, style === 'long' ? { weekday: 'long', day: 'numeric', month: 'long' } : { weekday: 'short', day: 'numeric', month: 'short' });
  const time = (w: string) => (locale === 'fr' ? hFr(w.slice(11)) : w.slice(11));
  if (!endsAt) return `${day(startsAt)} · ${time(startsAt)}`;
  if (endsAt.slice(0, 10) === startsAt.slice(0, 10)) return `${day(startsAt)} · ${time(startsAt)} – ${time(endsAt)}`;
  return `${day(startsAt)} ${time(startsAt)} → ${day(endsAt)} ${time(endsAt)}`;
}

export function EventWizard({
  open,
  onClose,
  initial,
  wasPublished,
  library,
  onUploaded,
  scope,
  onSaved,
  onUndo,
}: {
  open: boolean;
  onClose: () => void;
  initial: EventDraft;
  wasPublished: boolean;
  library: Library;
  onUploaded: (u: Upload) => void;
  scope: ClubId[] | 'all';
  onSaved: (saved: SavedEvent) => void;
  onUndo: (token: string) => Promise<void>;
}) {
  const { t, locale } = useI18n();
  const editing = Boolean(initial.id);
  const errs = (step: string) => (s: EventDraft) => translateErrors(t, pick(checkEvent(s, Date.now()), FIELDS[step]!));
  const clubs = scope === 'all' ? CLUB_IDS : CLUB_IDS.filter((c) => scope.includes(c));

  const steps: WizardStep<EventDraft>[] = [
    {
      id: 'type',
      title: t('evt.step.type'),
      hint: t('evt.step.type.hint'),
      validate: errs('type'),
      render: ({ state, set }) => (
        <Choices
          name="kind"
          value={state.kind}
          min={220}
          onChange={(v) => set({ kind: v })}
          options={EVENT_KINDS.map((k) => ({ value: k, title: t(`evt.kind.${k}` as MessageKey), sub: t(`evt.kind.${k}.sub` as MessageKey) }))}
        />
      ),
    },
    {
      id: 'infos',
      title: t('evt.step.infos'),
      hint: t('evt.step.infos.hint'),
      validate: errs('infos'),
      render: ({ state, set, errors }) => (
        <>
          <Field id="title" label={t('evt.f.title')} hint={t('evt.f.title.help')} error={errors.title} counter={{ n: state.title.trim().length, max: LIMITS.eventTitle }}>
            <TextInput id="title" value={state.title} error={errors.title} hint maxLength={LIMITS.eventTitle + 30} onChange={(e) => set({ title: e.target.value })} />
          </Field>
          <Field id="body" label={t('evt.f.body')} hint={t('evt.f.body.help')} error={errors.body} optional counter={state.body ? { n: state.body.trim().length, max: LIMITS.eventBody } : undefined}>
            <TextArea id="body" rows={7} value={state.body} error={errors.body} hint onChange={(e) => set({ body: e.target.value })} />
          </Field>
          <TypoNote texts={[state.title, state.body]} />
        </>
      ),
    },
    {
      id: 'quand',
      title: t('evt.step.quand'),
      hint: t('evt.step.quand.hint'),
      validate: errs('quand'),
      render: ({ state, set, errors }) => {
        const past = /^\d{4}-\d{2}-\d{2}$/.test(state.startDate) && /^\d{2}:\d{2}$/.test(state.startTime) && `${state.startDate}T${state.startTime}` < wallNowParis();
        return (
          <>
            <div className="form-grid ct-grid">
              <Field id="startDate" label={t('evt.f.startDate')} error={errors.startDate}>
                <TextInput id="startDate" type="date" value={state.startDate} error={errors.startDate} onChange={(e) => set((s) => ({ startDate: e.target.value, endDate: !s.hasEnd || s.endDate < e.target.value ? e.target.value : s.endDate }))} />
              </Field>
              <Field id="startTime" label={t('evt.f.startTime')} error={errors.startTime}>
                <TextInput id="startTime" type="time" step={300} value={state.startTime} error={errors.startTime} onChange={(e) => set({ startTime: e.target.value })} />
              </Field>
            </div>
            {past ? (
              <div className="callout" data-kind="warn" role="note">
                <IconAlert />
                <span>{t('evt.warn.past')}</span>
              </div>
            ) : null}
            <div className="card card-pad stack" style={{ '--gap': '14px' } as React.CSSProperties}>
              <div className="row ct-switch-card">
                <Switch id="hasEnd" checked={state.hasEnd} onChange={(v) => set((s) => ({ hasEnd: v, endDate: s.endDate || s.startDate }))} label={t('evt.f.hasEnd')} />
                <div className="stack" style={{ '--gap': '2px' } as React.CSSProperties}>
                  <p className="strong">{t('evt.f.hasEnd')}</p>
                  <p className="small muted">{t('evt.f.hasEnd.sub')}</p>
                </div>
              </div>
              {state.hasEnd ? (
                <div className="form-grid ct-grid">
                  <Field id="endDate" label={t('evt.f.endDate')} error={errors.endDate}>
                    <TextInput id="endDate" type="date" min={state.startDate} value={state.endDate} error={errors.endDate} onChange={(e) => set({ endDate: e.target.value })} />
                  </Field>
                  <Field id="endTime" label={t('evt.f.endTime')} error={errors.endTime}>
                    <TextInput id="endTime" type="time" step={300} value={state.endTime} error={errors.endTime} onChange={(e) => set({ endTime: e.target.value })} />
                  </Field>
                </div>
              ) : null}
            </div>
            <Field id="club" label={t('evt.f.club')} error={errors.club}>
              <Select<ClubId | 'aucun'> id="club" value={state.club} error={errors.club} onChange={(v) => set({ club: v })} options={[...(scope === 'all' ? [{ value: 'aucun' as const, label: t('evt.f.club.none') }] : []), ...clubs.map((c) => ({ value: c, label: CLUB_LABEL[c] }))]} />
            </Field>
            <Field id="venue" label={state.club === 'aucun' ? t('evt.f.venue.required') : t('evt.f.venue')} hint={t('evt.f.venue.help')} error={errors.venue} optional={state.club !== 'aucun'}>
              <TextInput id="venue" value={state.venue} error={errors.venue} hint maxLength={LIMITS.venue + 20} onChange={(e) => set({ venue: e.target.value })} />
            </Field>
          </>
        );
      },
    },
    {
      id: 'combat',
      title: t('evt.step.combat'),
      hint: t('evt.step.combat.hint'),
      lead: t('evt.fight.lead'),
      validate: errs('combat'),
      render: ({ state, set, errors }) => {
        if (!fightAllowed(state))
          return (
            <div className="callout" role="note">
              <IconInfo />
              <span>{t('evt.fight.skip')}</span>
            </div>
          );
        const fight = (patch: Partial<EventDraft['fight']>) => set((s) => ({ fight: { ...s.fight, ...patch } }));
        return (
          <>
            {state.kind === 'gala' ? (
              <div className="card card-pad row ct-switch-card">
                <Switch id="withFight" checked={state.withFight} onChange={(v) => set({ withFight: v })} label={t('evt.f.withFight')} />
                <div className="stack" style={{ '--gap': '2px' } as React.CSSProperties}>
                  <p className="strong">{t('evt.f.withFight')}</p>
                  <p className="small muted">{t('evt.f.withFight.sub')}</p>
                </div>
              </div>
            ) : null}
            {showsFight(state) ? (
              <>
                <div className="ct-fight-fields">
                  <Field id="fighter" label={t('evt.f.fighter')} error={errors.fighter}>
                    <TextInput id="fighter" value={state.fight.fighter} error={errors.fighter} maxLength={LIMITS.person + 10} onChange={(e) => fight({ fighter: e.target.value })} />
                  </Field>
                  <span className="ct-fight-vs" aria-hidden="true">
                    {locale === 'fr' ? 'contre' : 'vs'}
                  </span>
                  <Field id="opponent" label={t('evt.f.opponent')} error={errors.opponent}>
                    <TextInput id="opponent" value={state.fight.opponent} error={errors.opponent} maxLength={LIMITS.person + 10} onChange={(e) => fight({ opponent: e.target.value })} />
                  </Field>
                </div>
                <Field id="weightClass" label={t('evt.f.weightClass')} hint={t('evt.f.weightClass.help')} error={errors.weightClass} optional>
                  <TextInput id="weightClass" value={state.fight.weightClass} error={errors.weightClass} hint maxLength={LIMITS.weightClass + 10} style={{ maxWidth: 260 }} onChange={(e) => fight({ weightClass: e.target.value })} />
                </Field>
                <div className="form-grid ct-grid">
                  <Field id="beltTitle" label={t('evt.f.beltTitle')} error={errors.beltTitle} optional>
                    <TextInput id="beltTitle" value={state.fight.title} error={errors.beltTitle} maxLength={LIMITS.beltTitle + 10} onChange={(e) => fight({ title: e.target.value })} />
                  </Field>
                  <Field id="broadcaster" label={t('evt.f.broadcaster')} hint={t('evt.f.broadcaster.help')} error={errors.broadcaster} optional>
                    <TextInput id="broadcaster" value={state.fight.broadcaster} error={errors.broadcaster} hint maxLength={LIMITS.broadcaster + 10} onChange={(e) => fight({ broadcaster: e.target.value })} />
                  </Field>
                </div>
              </>
            ) : null}
          </>
        );
      },
    },
    {
      id: 'billetterie',
      title: t('evt.step.billetterie'),
      hint: t('evt.step.billetterie.hint'),
      validate: errs('billetterie'),
      render: ({ state, set, errors }) => (
        <>
          <Field id="ticketUrl" label={t('evt.f.ticket')} hint={t('evt.f.ticket.help')} error={errors.ticketUrl} optional>
            <TextInput id="ticketUrl" type="url" inputMode="url" placeholder="https://" value={state.ticketUrl} error={errors.ticketUrl} hint onChange={(e) => set({ ticketUrl: e.target.value })} />
          </Field>
          {state.ticketUrl.trim() !== BOUTIQUE ? (
            <button type="button" className="chip ct-chip-sm" style={{ justifySelf: 'start' }} onClick={() => set({ ticketUrl: BOUTIQUE })}>
              <IconLink size={15} />
              {t('evt.ticket.boutique')}
            </button>
          ) : null}
        </>
      ),
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
          suggestion={state.club !== 'aucun' ? { file: CLUB_PHOTO[state.club], label: CLUB_LABEL[state.club] } : undefined}
        />
      ),
    },
    {
      id: 'publication',
      title: t('contenu.step.publication'),
      hint: t('contenu.step.publication.hint'),
      validate: errs('publication'),
      render: ({ state, set, errors }) => (
        <>
          <DiffusionFields club="reseau" audience={state.audience} important={state.important} onChange={(p) => set({ ...(p.audience ? { audience: p.audience } : {}), ...(p.important !== undefined ? { important: p.important } : {}) })} errors={errors} scope={scope} showClub={false} />
          <PublishFields mode={state.mode} date={state.publishDate} time={state.publishTime} onChange={set} errors={errors} wasPublished={wasPublished} />
        </>
      ),
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
        const start = `${state.startDate}T${state.startTime}`;
        const where = [state.club !== 'aucun' ? CLUB_LABEL[state.club] : null, state.venue.trim() || null].filter(Boolean).join(' · ');
        const f = state.fight;
        return (
          <>
            <Review
              goTo={goTo}
              rows={[
                { label: t('evt.r.type'), step: 'type', value: state.kind ? t(`evt.kind.${state.kind}` as MessageKey) : '—' },
                { label: t('evt.r.title'), step: 'infos', value: <span className="strong">{frTypo(state.title.trim())}</span> },
                { label: t('evt.r.when'), step: 'quand', value: whenLabel(locale, start, state.hasEnd ? `${state.endDate}T${state.endTime}` : null) },
                { label: t('evt.r.where'), step: 'quand', value: where || '—' },
                ...(showsFight(state)
                  ? [{ label: t('evt.r.fight'), step: 'combat', value: [t('evt.vs', { a: f.fighter.trim(), b: f.opponent.trim() }), f.weightClass.trim(), f.title.trim(), f.broadcaster.trim()].filter(Boolean).join(' · ') }]
                  : []),
                { label: t('evt.r.ticket'), step: 'billetterie', value: state.ticketUrl.trim() || t('contenu.r.none') },
                { label: t('contenu.r.photo'), step: 'photo', value: state.photo ? state.photo.alt || state.photo.file : '—' },
                { label: t('contenu.r.audience'), step: 'publication', value: t(`audience.${state.audience}`) },
                { label: t('contenu.r.important'), step: 'publication', value: state.important ? t('contenu.r.important.yes') : t('contenu.r.important.no') },
                { label: t('contenu.r.publication'), step: 'publication', value: pub },
              ]}
            />
            <TypoNote texts={[state.title, state.body, state.venue, f.fighter, f.opponent]} />
          </>
        );
      },
    },
  ];

  return (
    <Wizard<EventDraft>
      open={open}
      onClose={onClose}
      kicker={t('evt.wiz.kicker')}
      title={editing ? t('evt.wiz.edit') : t('evt.wiz.new')}
      icon={<IconTicket size={22} />}
      steps={steps}
      initial={initial}
      draftKey={editing ? `evt-${initial.id}` : 'evt-nouveau'}
      submitLabel={(d) => (editing ? t('contenu.submit.save') : d.mode === 'publie' ? t('contenu.submit.publie') : d.mode === 'programme' ? t('contenu.submit.programme') : t('contenu.submit.brouillon'))}
      preview={(state) => (
        <PreviewPane>
          {(scheme) => (
            <EventPhone
              scheme={scheme}
              item={{
                kind: state.kind,
                title: frTypo(state.title),
                body: frTypo(state.body),
                startsAt: `${state.startDate}T${state.startTime}`,
                endsAt: state.hasEnd ? `${state.endDate}T${state.endTime}` : null,
                club: state.club === 'aucun' ? null : state.club,
                venue: state.venue,
                photo: state.photo,
                ticketUrl: state.ticketUrl.trim() || null,
                fight: showsFight(state) ? state.fight : null,
              }}
            />
          )}
        </PreviewPane>
      )}
      onSubmit={async (state) => {
        const res = await saveEventAction(state);
        if (!res.ok) {
          const fields = res.fieldErrors ? translateErrors(t, res.fieldErrors) : undefined;
          const first = res.fieldErrors ? Object.keys(res.fieldErrors)[0] : undefined;
          return { ok: false, error: t(`err.${res.error}` as MessageKey), fieldErrors: fields, step: first ? stepOfField(FIELDS, first) : undefined };
        }
        onSaved(res.data);
        const d = res.data;
        const message = !d.created
          ? t('evt.saved.edit')
          : d.status === 'programme' && d.publishAt
            ? t('evt.saved.programme', { when: fmtDateTime(locale, d.publishAt) })
            : d.status === 'brouillon'
              ? t('evt.saved.brouillon')
              : t('evt.saved.publie');
        return { ok: true, message, undo: () => onUndo(d.undo) };
      }}
    />
  );
}
