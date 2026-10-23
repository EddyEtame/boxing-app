'use client';

import { useRouter } from 'next/navigation';
import { useMemo } from 'react';

import { createMember, editMember, revertMember } from './actions';
import { Avatar, RoleIcon, RoleTag, SignatureBubble } from '@/components/team/TeamBits';
import { IconAlert, IconCheck, IconInfo, IconUsers } from '@/components/icons';
import { Chips, Choices, Field, Review, Segmented, TextInput } from '@/components/wizard/fields';
import { Wizard, type Errors, type WizardStep } from '@/components/wizard/Wizard';
import { useI18n } from '@/i18n/client';
import type { MessageKey } from '@/i18n/messages';
import { CLUB_IDS, CLUB_LABEL } from '@/lib/clubs';
import { clubsOf, identityErrors, NAME_MAX, roleErrors, scopeErrors, SIGN_MAX, signatureErrors, suggestSignature, type AccountDraft, type KeyErrors } from '@/lib/team/account-rules';
import { capLabel, rightsOf, roleLabel, scopeLabel } from '@/lib/team/labels';
import { ROLES, type ClubId, type Role } from '@/lib/types';

/**
 * L'assistant « Ajouter un membre de l'équipe » (et sa variante « Modifier ») :
 * qui, quel profil, quels clubs, quelle signature — puis relire. L'aperçu
 * montre la fiche de la personne et le message tel que l'adhérent le lira.
 */
export type WizardTarget = { mode: 'create'; preset?: Partial<AccountDraft> } | { mode: 'edit'; id: string; draft: AccountDraft; self: boolean };

const STEP_OF: Record<string, string> = { name: 'identite', email: 'identite', role: 'role', clubs: 'perimetre', signature: 'signature' };

export function AccountWizard({ target, onClose, onCreated }: { target: WizardTarget | null; onClose: () => void; onCreated: (r: { name: string; token: string; expiresAt: string }) => void }) {
  const { t } = useI18n();
  const router = useRouter();
  const editing = target?.mode === 'edit';

  const initial = useMemo<AccountDraft>(() => {
    if (target?.mode === 'edit') return target.draft;
    return { name: '', email: '', role: null, scope: 'all', clubs: [], signature: '', ...(target?.preset ?? {}) };
  }, [target]);

  const tr = (e: KeyErrors): Errors => Object.fromEntries(Object.entries(e).map(([k, v]) => [k, t(v as MessageKey)]));

  const steps: WizardStep<AccountDraft>[] = [
    {
      id: 'identite',
      title: t('team.wiz.identity'),
      hint: t('team.wiz.identity.hint'),
      validate: (s) => tr(identityErrors(s, !editing)),
      render: ({ state, set, errors }) => (
        <div className="stack" style={{ '--gap': '18px' } as React.CSSProperties}>
          <Field id="name" label={t('team.field.name')} error={errors.name} hint={t('team.field.name.hint')} counter={{ n: state.name.trim().length, max: NAME_MAX }}>
            <TextInput id="name" error={errors.name} hint value={state.name} maxLength={NAME_MAX + 10} autoComplete="off" onChange={(e) => set({ name: e.target.value })} />
          </Field>
          <Field id="email" label={t('team.field.email')} error={errors.email} hint={editing ? t('team.field.email.locked') : t('team.field.email.hint')}>
            <TextInput id="email" error={errors.email} hint type="email" inputMode="email" autoCapitalize="none" spellCheck={false} autoComplete="off" value={state.email} disabled={editing} onChange={(e) => set({ email: e.target.value })} />
          </Field>
        </div>
      ),
    },
    {
      id: 'role',
      title: t('team.wiz.role'),
      hint: t('team.wiz.role.hint'),
      validate: (s) => tr(roleErrors(s)),
      render: ({ state, set }) => {
        const rights = state.role ? rightsOf(state.role) : null;
        return (
          <div className="stack" style={{ '--gap': '18px' } as React.CSSProperties}>
            {target?.mode === 'edit' && target.self ? (
              <div className="callout" role="note">
                <IconInfo />
                <span>{t('team.wiz.role.self')}</span>
              </div>
            ) : null}
            <Choices<Role>
              name="role"
              value={state.role}
              min={230}
              onChange={(role) => set((s) => ({ role, scope: role === 'direction' ? 'all' : s.scope }))}
              options={ROLES.map((r) => ({ value: r, title: roleLabel(t, r), sub: t(`team.role.${r}.sub` as MessageKey), icon: <RoleIcon role={r} />, disabled: target?.mode === 'edit' && target.self && r !== state.role }))}
            />
            {state.role === 'direction' ? (
              <div className="callout" data-kind="warn" role="note">
                <IconAlert />
                <span>{t('team.wiz.role.direction')}</span>
              </div>
            ) : null}
            {rights ? (
              <div className="team-rights" aria-live="polite">
                <div>
                  <p className="eyebrow">{t('team.rights.can')}</p>
                  <ul>
                    {rights.can.map((c) => (
                      <li key={c} data-yes="true">
                        <IconCheck size={14} />
                        {capLabel(t, c)}
                      </li>
                    ))}
                  </ul>
                </div>
                {rights.cannot.length ? (
                  <div>
                    <p className="eyebrow">{t('team.rights.cannot')}</p>
                    <ul>
                      {rights.cannot.map((c) => (
                        <li key={c}>
                          <span aria-hidden="true">—</span>
                          {capLabel(t, c)}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        );
      },
    },
    {
      id: 'perimetre',
      title: t('team.wiz.scope'),
      hint: t('team.wiz.scope.hint'),
      validate: (s) => tr(scopeErrors(s)),
      render: ({ state, set, errors }) =>
        state.role === 'direction' ? (
          <div className="callout" role="note">
            <IconInfo />
            <span>{t('team.wiz.scope.direction')}</span>
          </div>
        ) : (
          <div className="stack" style={{ '--gap': '18px' } as React.CSSProperties}>
            <Segmented<'all' | 'clubs'>
              label={t('team.wiz.scope')}
              value={state.scope}
              onChange={(scope) => set({ scope })}
              options={[
                { value: 'all', label: t('team.scope.all') },
                { value: 'clubs', label: t('team.scope.some') },
              ]}
            />
            {state.scope === 'clubs' ? (
              <Field id="clubs" label={t('team.field.clubs')} error={errors.clubs} hint={t('team.field.clubs.hint')}>
                <Chips<ClubId> id="clubs" values={state.clubs} onChange={(clubs) => set({ clubs })} options={CLUB_IDS.map((c) => ({ value: c, label: CLUB_LABEL[c] }))} />
              </Field>
            ) : null}
            <p className="small muted">{t('team.wiz.scope.effect')}</p>
          </div>
        ),
    },
    {
      id: 'signature',
      title: t('team.wiz.signature'),
      hint: t('team.wiz.signature.hint'),
      validate: (s) => tr(signatureErrors(s)),
      render: ({ state, set, errors }) => {
        const suggestion = suggestSignature(state, (c) => CLUB_LABEL[c]);
        return (
          <div className="stack" style={{ '--gap': '18px' } as React.CSSProperties}>
            <Field id="signature" label={t('team.field.signature')} error={errors.signature} hint={t('team.field.signature.hint')} counter={{ n: state.signature.trim().length, max: SIGN_MAX }}>
              <TextInput id="signature" error={errors.signature} hint value={state.signature} maxLength={SIGN_MAX + 10} autoComplete="off" placeholder={suggestion} onChange={(e) => set({ signature: e.target.value })} />
            </Field>
            {suggestion && suggestion !== state.signature.trim() ? (
              <div className="row" style={{ '--gap': '8px' } as React.CSSProperties}>
                <span className="small muted">{t('team.wiz.signature.suggest')}</span>
                <button type="button" className="chip" onClick={() => set({ signature: suggestion })}>
                  {suggestion}
                </button>
              </div>
            ) : null}
            <SignatureBubble signature={state.signature || suggestion} />
          </div>
        );
      },
    },
    {
      id: 'relire',
      title: t('wiz.review'),
      hint: t('wiz.reviewHint'),
      render: ({ state, goTo }) => (
        <div className="stack" style={{ '--gap': '16px' } as React.CSSProperties}>
          <Review
            goTo={goTo}
            rows={[
              { label: t('team.field.name'), value: state.name.trim(), step: 'identite' },
              ...(editing ? [] : [{ label: t('team.field.email'), value: state.email.trim().toLowerCase(), step: 'identite' }]),
              { label: t('team.field.role'), value: state.role ? <RoleTag role={state.role} /> : '—', step: 'role' },
              { label: t('team.field.scope'), value: scopeLabel(t, clubsOf(state)), step: 'perimetre' },
              { label: t('team.field.signature'), value: `— ${state.signature.trim()}`, step: 'signature' },
            ]}
          />
          <div className="callout" role="note">
            <IconInfo />
            <span>{editing ? t('team.wiz.review.edit') : t('team.wiz.review.create')}</span>
          </div>
        </div>
      ),
    },
  ];

  const preview = (s: AccountDraft) => {
    const sign = s.signature.trim() || suggestSignature(s, (c) => CLUB_LABEL[c]);
    return (
      <div className="stack" style={{ '--gap': '16px' } as React.CSSProperties}>
        <div className="team-card">
          <Avatar name={s.name || '?'} size={48} />
          <div style={{ minWidth: 0 }}>
            <p className="team-card-name truncate">{s.name.trim() || t('team.preview.noName')}</p>
            <p className="small muted truncate">{s.email.trim() || t('team.preview.noEmail')}</p>
          </div>
          {s.role ? <RoleTag role={s.role} /> : null}
          <p className="team-card-scope small">
            <span className="dim">{t('team.field.scope')} · </span>
            {scopeLabel(t, clubsOf(s))}
          </p>
        </div>
        <p className="eyebrow">{t('team.preview.reads')}</p>
        <SignatureBubble signature={sign} />
        {s.role ? <p className="small dim">{t('team.preview.rights', { n: rightsOf(s.role).can.length, total: rightsOf(s.role).can.length + rightsOf(s.role).cannot.length })}</p> : null}
      </div>
    );
  };

  return (
    <Wizard<AccountDraft>
      open={target !== null}
      onClose={onClose}
      kicker={t('team.wiz.kicker')}
      title={target?.mode === 'edit' ? t('team.wiz.editTitle', { name: target.draft.name }) : t('team.wiz.title')}
      icon={<IconUsers />}
      steps={steps}
      initial={initial}
      draftKey={editing ? undefined : 'compte-nouveau'}
      preview={preview}
      previewLabel={t('team.preview.label')}
      submitLabel={editing ? t('btn.save') : t('team.wiz.submit')}
      onSubmit={async (s) => {
        const payload = { ...s, name: s.name.trim(), email: s.email.trim(), signature: s.signature.trim() };
        if (target?.mode === 'edit') {
          const res = await editMember(target.id, payload);
          if (!res.ok) return { ok: false, error: t(`err.${res.error}` as MessageKey), fieldErrors: res.fieldErrors ? tr(res.fieldErrors) : undefined, step: res.fieldErrors ? STEP_OF[Object.keys(res.fieldErrors)[0] ?? ''] : undefined };
          const before = res.data.before;
          return {
            ok: true,
            message: t('team.saved', { name: payload.name }),
            undo: async () => {
              await revertMember(target.id, before);
              router.refresh();
            },
          };
        }
        const res = await createMember(payload);
        if (!res.ok) return { ok: false, error: t(`err.${res.error}` as MessageKey), fieldErrors: res.fieldErrors ? tr(res.fieldErrors) : undefined, step: res.fieldErrors ? STEP_OF[Object.keys(res.fieldErrors)[0] ?? ''] : undefined };
        onCreated({ name: payload.name, token: res.data.token, expiresAt: res.data.expiresAt });
        return { ok: true, message: t('team.created', { name: payload.name }) };
      }}
    />
  );
}
