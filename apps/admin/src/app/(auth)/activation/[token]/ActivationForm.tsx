'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';

import { Logo } from '@/components/Logo';
import { IconAlert, IconCheck, IconEye, IconEyeOff, IconLock } from '@/components/icons';
import { useT } from '@/i18n/client';
import type { MessageKey } from '@/i18n/messages';
import { checkPassword, passwordOk, personalParts, PW_MAX, strength } from '@/lib/team/password';

type Problem = 'regles' | 'lien' | 'verrou' | 'reseau' | 'interne';

/**
 * Le mot de passe d'un nouveau membre de l'équipe. Les règles se cochent
 * pendant la frappe, la jauge dit la vérité (une suite de clavier fait
 * reculer), et rien n'est envoyé tant que tout n'est pas vert.
 */
export function ActivationForm({ token, name, email, role, scope, reset }: { token: string; name: string; email: string; role: string; scope: string; reset: boolean }) {
  const t = useT();
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [caps, setCaps] = useState(false);
  const [busy, setBusy] = useState(false);
  const [tried, setTried] = useState(false);
  const [problem, setProblem] = useState<{ kind: Problem; minutes?: number } | null>(null);
  const pwRef = useRef<HTMLInputElement>(null);

  const personal = useMemo(() => personalParts(name, email), [name, email]);
  const checks = checkPassword(password, confirm, personal);
  const level = strength(password);
  const first = name.trim().split(/\s+/)[0] ?? name;

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setTried(true);
    if (!passwordOk(checks)) {
      setProblem({ kind: 'regles' });
      (checks.length && checks.mix && checks.personal ? document.getElementById('act-confirm') : pwRef.current)?.focus();
      return;
    }
    setBusy(true);
    setProblem(null);
    try {
      const res = await fetch('/api/auth/activation', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ token, password, confirm }) });
      if (res.ok) {
        router.replace('/');
        router.refresh();
        return;
      }
      const body = (await res.json().catch(() => ({}))) as { error?: string; retryAfter?: number };
      if (res.status === 429) setProblem({ kind: 'verrou', minutes: Math.max(1, Math.ceil((body.retryAfter ?? 60) / 60)) });
      else if (res.status === 410) setProblem({ kind: 'lien' });
      else if (body.error === 'regles') setProblem({ kind: 'regles' });
      else setProblem({ kind: 'interne' });
    } catch {
      setProblem({ kind: 'reseau' });
    } finally {
      setBusy(false);
    }
  }

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => setCaps(e.getModifierState('CapsLock'));
  const rules: { key: keyof typeof checks; label: MessageKey }[] = [
    { key: 'length', label: 'act.rule.length' },
    { key: 'mix', label: 'act.rule.mix' },
    { key: 'personal', label: 'team.act.rule.personal' },
    { key: 'match', label: 'act.rule.match' },
  ];

  return (
    <form className="auth-form" onSubmit={submit} noValidate>
      <Logo width={168} className="auth-logo" />
      <div className="stack" style={{ '--gap': '8px' } as React.CSSProperties}>
        <h1 className="auth-title">{reset ? t('team.act.resetTitle') : t('act.title')}</h1>
        <p className="muted">{reset ? t('team.act.resetHello', { name: first }) : t('act.hello', { name: first })}</p>
      </div>

      <dl className="team-act-who">
        <div>
          <dt>{t('team.field.email')}</dt>
          <dd>{email}</dd>
        </div>
        <div>
          <dt>{t('team.field.role')}</dt>
          <dd>{role}</dd>
        </div>
        <div>
          <dt>{t('team.field.scope')}</dt>
          <dd>{scope}</dd>
        </div>
      </dl>

      {/* Pour les gestionnaires de mots de passe : l'identifiant du compte, invisible. Sans `name` : même un
          envoi natif du formulaire (avant que la page soit prête) ne met jamais l'adresse dans l'URL. */}
      <input type="email" autoComplete="username" value={email} readOnly hidden />

      <div className="field">
        <label className="field-label" htmlFor="act-password">
          <span>{t('act.password')}</span>
          {caps ? <span className="tag tag-warn">{t('login.caps')}</span> : null}
        </label>
        <div className="input-group">
          <IconLock size={18} />
          <input
            ref={pwRef}
            id="act-password"
            className="input"
            type={show ? 'text' : 'password'}
            autoComplete="new-password"
            maxLength={PW_MAX}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyUp={onKey}
            onKeyDown={onKey}
            aria-invalid={tried && !(checks.length && checks.mix && checks.personal) ? true : undefined}
            aria-describedby="act-rules act-meter"
            style={{ paddingRight: 52 }}
            autoFocus
          />
          <button type="button" className="btn btn-ghost btn-sm btn-icon input-action" onClick={() => setShow((s) => !s)} aria-label={show ? t('login.hide') : t('login.show')} title={show ? t('login.hide') : t('login.show')} aria-pressed={show}>
            {show ? <IconEyeOff size={18} /> : <IconEye size={18} />}
          </button>
        </div>
        <div className="team-meter" id="act-meter" data-level={level} aria-live="polite">
          <span className="team-meter-bar" aria-hidden="true">
            {[1, 2, 3, 4].map((i) => (
              <span key={i} data-on={level >= i} />
            ))}
          </span>
          <span className="small">{password ? t(`team.act.meter.${level}` as MessageKey) : t('team.act.meter.empty')}</span>
        </div>
      </div>

      <div className="field">
        <label className="field-label" htmlFor="act-confirm">
          {t('act.confirm')}
        </label>
        <div className="input-group">
          <IconLock size={18} />
          <input
            id="act-confirm"
            className="input"
            type={show ? 'text' : 'password'}
            autoComplete="new-password"
            maxLength={PW_MAX}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            aria-invalid={tried && !checks.match ? true : undefined}
            aria-describedby="act-rules"
          />
        </div>
      </div>

      <ul className="pw-rules" id="act-rules" aria-label={t('team.act.rules')}>
        {rules.map((r) => (
          <li key={r.key} data-ok={checks[r.key]}>
            {checks[r.key] ? <IconCheck size={15} /> : <span className="team-rule-dot" aria-hidden="true" />}
            <span>{t(r.label)}</span>
            <span className="sr-only">{checks[r.key] ? t('team.act.ok') : t('team.act.notYet')}</span>
          </li>
        ))}
      </ul>

      <div aria-live="assertive">
        {problem ? (
          <p className="field-error" role="alert">
            <IconAlert size={16} />
            <span>
              {problem.kind === 'regles'
                ? t('team.act.err.rules')
                : problem.kind === 'lien'
                  ? t('act.expired')
                  : problem.kind === 'verrou'
                    ? t('login.locked', { min: problem.minutes ?? 15 })
                    : problem.kind === 'reseau'
                      ? t('err.reseau')
                      : t('err.interne')}
            </span>
          </p>
        ) : null}
      </div>

      <button type="submit" className="btn btn-primary btn-lg btn-block" disabled={busy}>
        {busy ? <span className="spinner" aria-hidden="true" /> : null}
        {busy ? t('team.act.submitting') : reset ? t('team.act.resetSubmit') : t('act.submit')}
      </button>
      <p className="small dim">{t('team.act.note')}</p>
    </form>
  );
}
