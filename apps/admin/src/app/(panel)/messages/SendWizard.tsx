'use client';

import { reachOfMembers, sendToMembers } from './actions';
import { LockPreview, MessageCardPreview } from '@/components/comms/NotifPreview';
import { ReachMeter, targetLabel } from '@/components/comms/parts';
import { useReach } from '@/components/comms/useReach';
import { IconAlert, IconChat, IconInfo, IconLock, IconUsers } from '@/components/icons';
import { Choices, Chips, Field, Review, Select, TextArea, TextInput } from '@/components/wizard/fields';
import { Wizard, type Errors, type WizardStep } from '@/components/wizard/Wizard';
import { useI18n } from '@/i18n/client';
import type { MessageKey } from '@/i18n/messages';
import { CLUB_IDS, CLUB_LABEL } from '@/lib/clubs';
import { LIMITS, MESSAGE_STATUTS, type OutgoingDraft } from '@/lib/comms/types';
import { checkOutgoingText, checkOutgoingTo, cleanText, type FieldErrors } from '@/lib/comms/validate';
import { FAMILLES, type ClubId, type Famille } from '@/lib/types';

type Fam = Exclude<Famille, 'accesLibre'>;
const FAMS = FAMILLES.filter((f): f is Fam => f !== 'accesLibre');

const STEP_OF: Record<string, string> = { kind: 'to', memberId: 'to', memberClub: 'to', memberName: 'to', clubs: 'to', statuts: 'to', familles: 'to', text: 'text' };

export function initialOutgoing(scope: ClubId[] | 'all'): OutgoingDraft {
  return { kind: null, memberId: '', memberName: '', memberClub: scope !== 'all' && scope.length === 1 ? scope[0]! : '', clubs: scope, statuts: ['actif'], familles: [], text: '' };
}

/** « Écrire à des adhérents » (CDC §10) : à sens unique, signé, en notification. */
export function SendWizard({ open, onClose, scope, signature, onSent }: { open: boolean; onClose: () => void; scope: ClubId[] | 'all'; signature: string; onSent: () => void }) {
  const { t } = useI18n();
  const tr = (e: FieldErrors): Errors => Object.fromEntries(Object.entries(e).map(([k, v]) => [k, t(v)]));
  const clubs = scope === 'all' ? CLUB_IDS : CLUB_IDS.filter((c) => scope.includes(c));

  const toLabel = (s: OutgoingDraft) => {
    if (s.kind === 'membre') return s.memberName.trim() ? t('comms.s.memberNamed', { name: cleanText(s.memberName, false), id: s.memberId }) : t('comms.s.member', { id: s.memberId || '…' });
    if (s.kind === 'groupe') {
      const fam = s.familles.length ? ` · ${s.familles.map((f) => t(`comms.famille.${f}` as MessageKey)).join(', ')}` : '';
      return `${targetLabel(t, s.clubs, s.statuts)}${fam}`;
    }
    return '—';
  };

  const steps: WizardStep<OutgoingDraft>[] = [
    {
      id: 'to',
      title: t('comms.sw.step.to'),
      hint: t('comms.sw.step.to.hint'),
      validate: (s) => tr(checkOutgoingTo(s, scope)),
      render: ({ state, set, errors }) => (
        <>
          <Field id="kind" label={t('comms.f.kind')} error={errors.kind}>
            <Choices<'membre' | 'groupe'>
              name="kind"
              value={state.kind}
              min={220}
              onChange={(v) => set({ kind: v })}
              options={[
                { value: 'membre', title: t('comms.sw.kind.membre'), sub: t('comms.sw.kind.membre.sub'), icon: <IconChat size={20} /> },
                { value: 'groupe', title: t('comms.sw.kind.groupe'), sub: t('comms.sw.kind.groupe.sub'), icon: <IconUsers size={20} /> },
              ]}
            />
          </Field>
          {state.kind === 'membre' ? (
            <>
              <div className="form-grid comms-member-grid">
                <Field id="memberId" label={t('comms.f.memberId')} hint={t('comms.f.memberId.help')} error={errors.memberId}>
                  <TextInput id="memberId" className="input mono" inputMode="numeric" autoComplete="off" value={state.memberId} error={errors.memberId} hint maxLength={12} onChange={(e) => set({ memberId: e.target.value.replace(/[^\d]/g, '') })} />
                </Field>
                <Field id="memberClub" label={t('comms.f.memberClub')} hint={t('comms.f.memberClub.help')} error={errors.memberClub}>
                  <Select<ClubId | ''> id="memberClub" value={state.memberClub} error={errors.memberClub} onChange={(v) => set({ memberClub: v })} options={[{ value: '', label: '—' }, ...clubs.map((c) => ({ value: c, label: CLUB_LABEL[c] }))]} />
                </Field>
              </div>
              <Field id="memberName" label={t('comms.f.memberName')} hint={t('comms.f.memberName.help')} error={errors.memberName} optional>
                <TextInput id="memberName" value={state.memberName} error={errors.memberName} hint maxLength={80} autoComplete="off" onChange={(e) => set({ memberName: e.target.value })} />
              </Field>
              <div className="callout" data-kind="warn" role="note">
                <IconAlert />
                <span>{t('comms.sw.unverified')}</span>
              </div>
            </>
          ) : null}
          {state.kind === 'groupe' ? (
            <>
              <Field id="clubs" label={t('comms.f.clubs')} error={errors.clubs}>
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
              <Field id="statuts" label={t('comms.f.statutsMsg')} hint={t('comms.f.statutsMsg.help')} error={errors.statuts}>
                <Chips id="statuts" values={state.statuts} onChange={(v) => set({ statuts: MESSAGE_STATUTS.filter((s) => v.includes(s)) })} options={MESSAGE_STATUTS.map((s) => ({ value: s, label: t(`statut.${s}` as MessageKey) }))} />
              </Field>
              <Field id="familles" label={t('comms.f.familles')} hint={t('comms.f.familles.help')} error={errors.familles} optional>
                <Chips<Fam> id="familles" values={state.familles} onChange={(v) => set({ familles: v })} options={FAMS.map((f) => ({ value: f, label: t(`comms.famille.${f}` as MessageKey), swatch: `var(--disc-${f.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)})` }))} />
              </Field>
              {state.familles.length ? (
                <div className="callout" role="note">
                  <IconInfo />
                  <span>{t('comms.sw.famillesNote')}</span>
                </div>
              ) : null}
              <GroupReach clubs={state.clubs} statuts={state.statuts} />
            </>
          ) : null}
        </>
      ),
    },
    {
      id: 'text',
      title: t('comms.sw.step.text'),
      hint: t('comms.sw.step.text.hint'),
      validate: (s) => tr(checkOutgoingText(s)),
      render: ({ state, set, errors }) => (
        <>
          <Field id="text" label={t('comms.f.text')} hint={t('comms.f.text.help')} error={errors.text} counter={{ n: state.text.length, max: LIMITS.message }}>
            <TextArea id="text" rows={7} value={state.text} error={errors.text} hint maxLength={1400} onChange={(e) => set({ text: e.target.value })} />
          </Field>
          <p className="comms-signed">
            <IconChat size={16} />
            {t('comms.sw.signedAs', { sig: signature })}
          </p>
          <div className="callout" role="note">
            <IconLock />
            <span>{t('comms.sw.oneWay')}</span>
          </div>
        </>
      ),
    },
    {
      id: 'apercu',
      title: t('comms.sw.step.apercu'),
      hint: t('comms.sw.step.apercu.hint'),
      render: ({ state }) => (
        <div className="phones comms-phones">
          <LockPreview title={signature} body={cleanText(state.text, false)} scheme="dark" caption={`${t('comms.preview.lock')} · ${t('theme.dark')}`} photo="minimes-sacs.jpg" />
          <MessageCardPreview signature={signature} text={cleanText(state.text, true)} scheme="dark" caption={`${t('comms.sw.preview.card')} · ${t('theme.dark')}`} readOnly={t('comms.sw.preview.readOnly')} />
        </div>
      ),
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
              { label: t('comms.sw.r.to'), step: 'to', value: toLabel(state) },
              { label: t('comms.sw.r.text'), step: 'text', value: <span className="comms-pre">{cleanText(state.text, true)}</span> },
              { label: t('comms.sw.r.signature'), step: 'text', value: signature },
              { label: t('comms.sw.r.reach'), step: 'to', value: state.kind === 'groupe' ? <GroupReachInline clubs={state.clubs} statuts={state.statuts} /> : t('comms.s.reachMember') },
            ]}
          />
          <div className="callout" role="note">
            <IconLock />
            <span>{t('comms.sw.oneWay')}</span>
          </div>
        </>
      ),
    },
  ];

  return (
    <Wizard<OutgoingDraft>
      open={open}
      onClose={onClose}
      kicker={t('comms.sw.kicker')}
      title={t('comms.sw.title')}
      icon={<IconChat size={22} />}
      steps={steps}
      initial={initialOutgoing(scope)}
      draftKey="message-equipe"
      submitLabel={t('comms.sw.submit')}
      submitKind="bell"
      previewLabel={t('comms.sw.preview.card')}
      preview={(state) => <MessageCardPreview signature={signature} text={cleanText(state.text, true)} scheme="light" readOnly={t('comms.sw.preview.readOnly')} />}
      onSubmit={async (state) => {
        const res = await sendToMembers(state);
        if (!res.ok) {
          const fieldErrors = res.fieldErrors ? Object.fromEntries(Object.entries(res.fieldErrors).map(([k, v]) => [k, t(v as MessageKey)])) : undefined;
          const first = fieldErrors ? Object.keys(fieldErrors)[0] : undefined;
          return { ok: false, error: t(`err.${res.error}` as MessageKey), fieldErrors, step: first ? STEP_OF[first] : undefined };
        }
        onSent();
        return { ok: true, message: t('comms.sw.done') };
      }}
    />
  );
}

function GroupReach({ clubs, statuts }: Pick<OutgoingDraft, 'clubs' | 'statuts'>) {
  const { reach, loading } = useReach({ clubs, statuts }, reachOfMembers);
  return <ReachMeter reach={reach} loading={loading} />;
}

function GroupReachInline({ clubs, statuts }: Pick<OutgoingDraft, 'clubs' | 'statuts'>) {
  const { t } = useI18n();
  const { reach, loading } = useReach({ clubs, statuts }, reachOfMembers);
  if (loading) return <>{t('comms.reach.loading')}</>;
  if (!reach?.measured) return <>{t('comms.reach.unmeasured')}</>;
  return <>{t('comms.reach.value', { n: reach.installs })}</>;
}
