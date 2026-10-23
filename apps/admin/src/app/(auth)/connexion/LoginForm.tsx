'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState, type FormEvent, type KeyboardEvent } from 'react';

import { Logo } from '@/components/Logo';
import { IconAlert, IconEye, IconEyeOff, IconInfo, IconLock, IconMail } from '@/components/icons';
import { useT } from '@/i18n/client';
import type { ConfigStatus } from '@/server/env';

type Problem = { kind: 'invalid' } | { kind: 'required' } | { kind: 'locked'; minutes: number } | { kind: 'config'; what: string[] } | { kind: 'network' };

export function LoginForm({ next, config, expired }: { next: string; config: ConfigStatus; expired: boolean }) {
  const t = useT();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [caps, setCaps] = useState(false);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<Problem | null>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  const missing = [...(config.direction ? [] : ['direction']), ...(config.secret ? [] : ['secret'])];

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (!email.trim() || !password) {
      setProblem({ kind: 'required' });
      (email.trim() ? passwordRef.current : document.getElementById('email'))?.focus();
      return;
    }
    setBusy(true);
    setProblem(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (res.ok) {
        router.replace(next);
        router.refresh();
        return;
      }
      const body = (await res.json().catch(() => ({}))) as { error?: string; retryAfter?: number; missing?: string[] };
      if (res.status === 429) setProblem({ kind: 'locked', minutes: Math.max(1, Math.ceil((body.retryAfter ?? 60) / 60)) });
      else if (res.status === 503 || (body.missing?.length ?? 0) > 0) setProblem({ kind: 'config', what: body.missing ?? missing });
      else setProblem({ kind: 'invalid' });
      setPassword('');
      passwordRef.current?.focus();
    } catch {
      setProblem({ kind: 'network' });
    } finally {
      setBusy(false);
    }
  }

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => setCaps(e.getModifierState('CapsLock'));
  const configText = (what: string[]) => t('login.config', { what: what.map((w) => (w === 'direction' ? t('login.config.direction') : t('login.config.secret'))).join(' · ') });

  return (
    <form className="auth-form" onSubmit={submit} noValidate>
      <Logo width={168} className="auth-logo" />
      <div className="stack" style={{ '--gap': '8px' } as React.CSSProperties}>
        <h1 className="auth-title">{t('login.title')}</h1>
        <p className="muted">{t('login.subtitle')}</p>
      </div>

      {expired && !problem ? (
        <div className="callout" role="status">
          <IconInfo />
          <span>{t('login.expired')}</span>
        </div>
      ) : null}

      {missing.length > 0 && !problem ? (
        <div className="callout" data-kind="warn" role="status">
          <IconAlert />
          <span>{configText(missing)}</span>
        </div>
      ) : null}

      <div className="field">
        <label className="field-label" htmlFor="email">
          {t('login.email')}
        </label>
        <div className="input-group">
          <IconMail size={18} />
          <input
            id="email"
            className="input"
            type="email"
            inputMode="email"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={problem?.kind === 'invalid' || undefined}
            autoFocus
          />
        </div>
      </div>

      <div className="field">
        <label className="field-label" htmlFor="password">
          <span>{t('login.password')}</span>
          {caps ? <span className="tag tag-warn">{t('login.caps')}</span> : null}
        </label>
        <div className="input-group">
          <IconLock size={18} />
          <input
            ref={passwordRef}
            id="password"
            className="input"
            type={show ? 'text' : 'password'}
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyUp={onKey}
            onKeyDown={onKey}
            aria-invalid={problem?.kind === 'invalid' || undefined}
            style={{ paddingRight: 52 }}
          />
          <button type="button" className="btn btn-ghost btn-sm btn-icon input-action" onClick={() => setShow((s) => !s)} aria-label={show ? t('login.hide') : t('login.show')} title={show ? t('login.hide') : t('login.show')} aria-pressed={show}>
            {show ? <IconEyeOff size={18} /> : <IconEye size={18} />}
          </button>
        </div>
      </div>

      <div aria-live="assertive">
        {problem ? (
          <p className="field-error" role="alert">
            <IconAlert size={16} />
            <span>
              {problem.kind === 'invalid'
                ? t('login.invalid')
                : problem.kind === 'required'
                  ? t('login.required')
                  : problem.kind === 'locked'
                  ? t('login.locked', { min: problem.minutes })
                  : problem.kind === 'config'
                    ? configText(problem.what)
                    : t('err.reseau')}
            </span>
          </p>
        ) : null}
      </div>

      <button type="submit" className="btn btn-primary btn-lg btn-block" disabled={busy}>
        {busy ? <span className="spinner" aria-hidden="true" /> : null}
        {busy ? t('login.submitting') : t('login.submit')}
      </button>

      <div className="stack small dim" style={{ '--gap': '6px' } as React.CSSProperties}>
        <p>{t('login.note')}</p>
        <p>{t('login.team')}</p>
      </div>
    </form>
  );
}
