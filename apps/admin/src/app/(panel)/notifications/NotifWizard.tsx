'use client';

import type { ReactNode } from 'react';

import { cancelNotifs, reachOf, sendNotification } from './actions';
import { BannerPreview, LockPreview } from '@/components/comms/NotifPreview';
import { linkLabel, ReachMeter, targetLabel, TypeIcon } from '@/components/comms/parts';
import { useReach } from '@/components/comms/useReach';
import { IconAlert, IconBell, IconCheck, IconClock, IconInfo } from '@/components/icons';
import { Choices, Chips, Field, Review, Segmented, Select, TextArea, TextInput } from '@/components/wizard/fields';
import { Wizard, type Errors, type WizardStep } from '@/components/wizard/Wizard';
import { useI18n } from '@/i18n/client';
import type { MessageKey } from '@/i18n/messages';
import { CLUB_IDS, CLUB_LABEL } from '@/lib/clubs';
import { isQuietHour, isoToParis, parisToIso } from '@/lib/comms/time';
import { APP_LINKS, LIMITS, LOCK_CUT, NOTIF_META, STATUTS, type AppLink, type NotifDraft } from '@/lib/comms/types';
import { checkNotifMessage, checkNotifMoment, checkNotifTarget, checkNotifType, cleanText, type FieldErrors } from '@/lib/comms/validate';
import { fmtDateTime, fmtTime } from '@/lib/format';
import { NOTIF_MANUAL, type ClubId, type NotifType } from '@/lib/types';

/** Le champ fautif → l'étape qui le règle (pour une erreur renvoyée par le serveur). */
const STEP_OF: Record<string, string> = { type: 'type', title: 'message', body: 'message', link: 'message', clubs: 'cible', statuts: 'cible', at: 'moment' };

export function NotifWizard({ open, onClose, initial, scope, note, draftKey }: { open: boolean; onClose: () => void; initial: NotifDraft; scope: ClubId[] | 'all'; note?: ReactNode; draftKey: string }) {
  const { t, locale } = useI18n();
  const tr = (e: FieldErrors): Errors => Object.fromEntries(Object.entries(e).map(([k, v]) => [k, t(v)]));
  const clubs = scope === 'all' ? CLUB_IDS : CLUB_IDS.filter((c) => scope.includes(c));

  const steps: WizardStep<NotifDraft>[] = [
      {
        id: 'type',
        title: t('comms.nw.step.type'),
        hint: t('comms.nw.step.type.hint'),
        validate: (s) => tr(checkNotifType(s)),
        render: ({ state, set, errors }) => (
          <>
            {note}
            <Field id="type" label={t('comms.f.type')} error={errors.type}>
              <Choices<NotifType>
                name="type"
                value={state.type}
                min={250}
                onChange={(v) => set((s) => ({ type: v, link: s.link || NOTIF_META[v].link }))}
                options={NOTIF_MANUAL.map((v) => ({
                  value: v,
                  title: t(`comms.type.${v}` as MessageKey),
                  sub: t(`comms.type.${v}.when` as MessageKey),
                  icon: <TypeIcon type={v} size={20} />,
                  tag: <span className={NOTIF_META[v].essential ? 'tag tag-ink' : 'tag'}>{NOTIF_META[v].essential ? t('comms.type.essential') : t('comms.type.mutable')}</span>,
                }))}
              />
            </Field>
            {state.type ? (
              <div className="callout" role="note">
                <IconInfo />
                <span>{NOTIF_META[state.type].essential ? t('comms.type.essentialWhere') : t('comms.type.mutableWhere', { pref: t(`comms.pref.${NOTIF_META[state.type].pref}` as MessageKey) })}</span>
              </div>
            ) : null}
          </>
        ),
      },
      {
        id: 'message',
        title: t('comms.nw.step.message'),
        hint: t('comms.nw.step.message.hint'),
        validate: (s) => tr(checkNotifMessage(s)),
        render: ({ state, set, errors }) => (
          <>
            <Field id="title" label={t('comms.f.title')} hint={t('comms.f.title.help', { n: LOCK_CUT.title })} error={errors.title} counter={{ n: state.title.length, max: LIMITS.title }}>
              <TextInput id="title" value={state.title} error={errors.title} hint maxLength={90} autoComplete="off" onChange={(e) => set({ title: e.target.value })} />
            </Field>
            <Field id="body" label={t('comms.f.body')} hint={t('comms.f.body.help', { n: LOCK_CUT.body })} error={errors.body} counter={{ n: state.body.length, max: LIMITS.body }}>
              <TextArea id="body" rows={3} value={state.body} error={errors.body} hint maxLength={300} onChange={(e) => set({ body: e.target.value })} />
            </Field>
            <Field id="link" label={t('comms.f.link')} hint={t('comms.f.link.help')} error={errors.link}>
              <Select<AppLink | ''> id="link" value={state.link} error={errors.link} onChange={(v) => set({ link: v })} options={[{ value: '', label: linkLabel(t, '') }, ...APP_LINKS.map((l) => ({ value: l, label: linkLabel(t, l) }))]} />
            </Field>
          </>
        ),
      },
      {
        id: 'cible',
        title: t('comms.nw.step.cible'),
        hint: t('comms.nw.step.cible.hint'),
        validate: (s) => tr(checkNotifTarget(s, scope)),
        render: ({ state, set, errors }) => (
          <>
            <Field id="clubs" label={t('comms.f.clubs')} hint={t('comms.f.clubs.help')} error={errors.clubs}>
              <Chips<ClubId | 'all'>
                id="clubs"
                values={state.clubs === 'all' ? ['all'] : state.clubs}
                onChange={(vals) => {
                  const wantsAll = vals.includes('all') && state.clubs !== 'all';
                  set({ clubs: wantsAll ? 'all' : vals.filter((v): v is ClubId => v !== 'all') });
                }}
                options={[...(scope === 'all' ? [{ value: 'all' as const, label: t('comms.f.network') }] : []), ...clubs.map((c) => ({ value: c, label: CLUB_LABEL[c] }))]}
              />
            </Field>
            <Field id="statuts" label={t('comms.f.statuts')} hint={t('comms.f.statuts.help')} error={errors.statuts}>
              <Chips id="statuts" values={state.statuts} onChange={(v) => set({ statuts: STATUTS.filter((s) => v.includes(s)) })} options={STATUTS.map((s) => ({ value: s, label: t(`statut.${s}` as MessageKey) }))} />
            </Field>
            <dl className="comms-defs">
              {STATUTS.map((s) => (
                <div key={s}>
                  <dt>{t(`statut.${s}` as MessageKey)}</dt>
                  <dd>{t(`statutLong.${s}` as MessageKey).split(' — ')[1]}</dd>
                </div>
              ))}
            </dl>
            <LiveReach clubs={state.clubs} statuts={state.statuts} />
          </>
        ),
      },
      {
        id: 'moment',
        title: t('comms.nw.step.moment'),
        hint: t('comms.nw.step.moment.hint'),
        validate: (s) => tr(checkNotifMoment(s, Date.now())),
        render: ({ state, set, errors }) => {
          const iso = state.when === 'scheduled' ? parisToIso(state.at) : null;
          const quiet = state.when === 'scheduled' ? Boolean(iso && isQuietHour(iso)) : isQuietHour(Date.now());
          return (
            <>
              <Field id="when" label={t('comms.f.when')}>
                <Segmented<'now' | 'scheduled'>
                  label={t('comms.f.when')}
                  value={state.when}
                  onChange={(v) => set((s) => ({ when: v, at: v === 'scheduled' && !s.at ? isoToParis(Date.now() + 2 * 3600_000).slice(0, 14) + '00' : s.at }))}
                  options={[
                    { value: 'now', label: t('comms.f.when.now') },
                    { value: 'scheduled', label: t('comms.f.when.scheduled') },
                  ]}
                />
              </Field>
              {state.when === 'scheduled' ? (
                <Field id="at" label={t('comms.f.at')} hint={t('comms.f.at.help')} error={errors.at}>
                  <TextInput id="at" type="datetime-local" value={state.at} error={errors.at} hint step={300} min={isoToParis(Date.now() + 5 * 60_000)} max={isoToParis(Date.now() + 60 * 86_400_000)} onChange={(e) => set({ at: e.target.value })} style={{ maxWidth: 280 }} />
                </Field>
              ) : (
                <div className="callout" role="note">
                  <IconClock />
                  <span>{t('comms.nowNote')}</span>
                </div>
              )}
              {quiet && state.type !== 'direction' ? (
                <div className="callout" data-kind="warn" role="note">
                  <IconAlert />
                  <span>{t('comms.quiet')}</span>
                </div>
              ) : null}
            </>
          );
        },
      },
      {
        id: 'apercu',
        title: t('comms.nw.step.apercu'),
        hint: t('comms.nw.step.apercu.hint'),
        render: ({ state }) => <PreviewStep state={state} />,
      },
      {
        id: 'relire',
        title: t('wiz.review'),
        hint: t('wiz.reviewShort'),
        lead: t('wiz.reviewHint'),
        render: ({ state, goTo }) => (
          <>
            <Review
              goTo={goTo}
              rows={[
                { label: t('comms.r.type'), step: 'type', value: state.type ? t(`comms.type.${state.type}` as MessageKey) : '—' },
                {
                  label: t('comms.r.message'),
                  step: 'message',
                  value: (
                    <>
                      <strong>{cleanText(state.title, false)}</strong>
                      <br />
                      {cleanText(state.body, false)}
                    </>
                  ),
                },
                { label: t('comms.r.link'), step: 'message', value: linkLabel(t, state.link) },
                { label: t('comms.r.target'), step: 'cible', value: targetLabel(t, state.clubs, state.statuts) },
                { label: t('comms.r.reach'), step: 'cible', value: <ReachInline clubs={state.clubs} statuts={state.statuts} /> },
                { label: t('comms.r.when'), step: 'moment', value: state.when === 'now' ? t('comms.r.now') : t('comms.r.at', { when: parisToIso(state.at) ? fmtDateTime(locale, parisToIso(state.at)!) : '—' }) },
              ]}
            />
          </>
        ),
      },
  ];

  return (
    <Wizard<NotifDraft>
      open={open}
      onClose={onClose}
      kicker={t('comms.nw.kicker')}
      title={t('comms.nw.title')}
      icon={<IconBell size={22} />}
      steps={steps}
      initial={initial}
      draftKey={draftKey}
      submitLabel={t('comms.nw.submit')}
      submitKind="bell"
      previewLabel={t('comms.preview.lock')}
      preview={(state) => <LockPreview title={cleanText(state.title, false)} body={cleanText(state.body, false)} scheme="light" />}
      onSubmit={async (state) => {
        const res = await sendNotification(state);
        if (!res.ok) {
          const fieldErrors = res.fieldErrors ? Object.fromEntries(Object.entries(res.fieldErrors).map(([k, v]) => [k, t(v as MessageKey)])) : undefined;
          const first = fieldErrors ? Object.keys(fieldErrors)[0] : undefined;
          return { ok: false, error: t(`err.${res.error}` as MessageKey), fieldErrors, step: first ? STEP_OF[first] : undefined };
        }
        const id = res.data.id;
        return {
          ok: true,
          message: res.data.at ? t('comms.nw.done.scheduled', { when: fmtDateTime(locale, res.data.at) }) : t('comms.nw.done.now'),
          undo: async () => {
            await cancelNotifs([id]);
          },
        };
      }}
    />
  );
}

function LiveReach({ clubs, statuts }: Pick<NotifDraft, 'clubs' | 'statuts'>) {
  const { reach, loading } = useReach({ clubs, statuts }, reachOf);
  return <ReachMeter reach={reach} loading={loading} />;
}

function ReachInline({ clubs, statuts }: Pick<NotifDraft, 'clubs' | 'statuts'>) {
  const { t } = useI18n();
  const { reach, loading } = useReach({ clubs, statuts }, reachOf);
  if (loading) return <>{t('comms.reach.loading')}</>;
  if (!reach?.measured) return <>{t('comms.reach.unmeasured')}</>;
  return <>{t('comms.reach.value', { n: reach.installs })}</>;
}

/** L'aperçu en grand, et les contrôles qui disent ce que le système va couper. */
function PreviewStep({ state }: { state: NotifDraft }) {
  const { t, locale } = useI18n();
  const title = cleanText(state.title, false);
  const body = cleanText(state.body, false);
  const iso = state.when === 'scheduled' ? parisToIso(state.at) : null;
  const quietAt = iso ?? new Date().toISOString();
  const quiet = isQuietHour(quietAt) && state.type !== 'direction';
  const checks: { ok: boolean; text: string }[] = [
    title.length <= LOCK_CUT.title ? { ok: true, text: t('comms.check.titleFits') } : { ok: false, text: t('comms.check.titleCut', { n: title.length }) },
    body.length <= LOCK_CUT.body ? { ok: true, text: t('comms.check.bodyFits') } : { ok: false, text: t('comms.check.bodyCut', { n: LOCK_CUT.body }) },
    { ok: true, text: t('comms.check.link', { screen: linkLabel(t, state.link) }) },
  ];
  if (state.type && !NOTIF_META[state.type].essential) checks.push({ ok: true, text: t('comms.check.mutable') });
  if (quiet) checks.push({ ok: false, text: t('comms.check.quiet', { time: fmtTime(locale, quietAt) }) });
  return (
    <>
      <div className="phones comms-phones">
        <LockPreview title={title} body={body} scheme="dark" caption={`${t('comms.preview.lock')} · ${t('theme.dark')}`} photo="gala-ring-foule.jpg" />
        <BannerPreview title={title} body={body} scheme="light" caption={`${t('comms.preview.banner')} · ${t('theme.light')}`} screen={linkLabel(t, state.link === '' ? '/' : state.link)} />
      </div>
      <section className="card card-pad stack" style={{ '--gap': '10px' } as React.CSSProperties} aria-label={t('comms.preview.checks')}>
        <p className="strong">{t('comms.preview.checks')}</p>
        <ul className="comms-checks">
          {checks.map((c) => (
            <li key={c.text} data-ok={c.ok}>
              {c.ok ? <IconCheck size={16} /> : <IconAlert size={16} />}
              <span>{c.text}</span>
            </li>
          ))}
          <li data-ok>
            <IconCheck size={16} />
            <span>
              {t('comms.r.reach')} · <ReachInline clubs={state.clubs} statuts={state.statuts} />
            </span>
          </li>
        </ul>
      </section>
    </>
  );
}
