import type { Metadata } from 'next';
import Link from 'next/link';

import { ActivationForm } from './ActivationForm';
import { Logo } from '@/components/Logo';
import { LangToggle, ThemeToggle } from '@/components/Toggles';
import { IconAlert } from '@/components/icons';
import { getT } from '@/i18n/server';
import { roleLabel, scopeLabel } from '@/lib/team/labels';
import { findByActivation } from '@/server/accounts';

// Le jeton est dans l'adresse : il ne part jamais vers un autre site par l'en-tête Referer.
export const metadata: Metadata = { title: 'Activation', referrer: 'no-referrer' };

function decoded(v: string): string {
  try {
    return decodeURIComponent(v);
  } catch {
    return '';
  }
}

export default async function ActivationPage({ params }: { params: Promise<{ token: string }> }) {
  const token = decoded((await params).token);
  const account = await findByActivation(token);
  const { t } = await getT();

  return (
    <div className="auth">
      <div className="auth-tools">
        <ThemeToggle compact />
        <LangToggle />
      </div>
      <section className="auth-art" aria-hidden="true">
        {/* Photo réelle du club (photothèque de l'app). */}
        {/* eslint-disable-next-line @next/next/no-img-element -- image locale servie par l'API média, sans optimisation */}
        <img className="auth-photo" src="/api/media/app/photos/minimes-pattes-ring.jpg" alt="" />
        <div className="auth-caption">
          <p className="lower-third">{t('login.clubs')}</p>
          <p className="display">
            {t('team.act.poster1')}
            <br />
            {t('team.act.poster2')}
          </p>
        </div>
      </section>
      <main className="auth-form-wrap" id="contenu">
        {account ? (
          <ActivationForm
            token={token}
            name={account.name}
            email={account.email}
            role={roleLabel(t, account.role)}
            scope={scopeLabel(t, account.clubs)}
            reset={Boolean(account.passwordHash)}
          />
        ) : (
          <div className="auth-form">
            <Logo width={168} className="auth-logo" />
            <div className="stack" style={{ '--gap': '8px' } as React.CSSProperties}>
              <h1 className="auth-title">{t('team.act.deadTitle')}</h1>
              <p className="muted">{t('act.expired')}</p>
            </div>
            <div className="callout" data-kind="warn" role="status">
              <IconAlert />
              <span>{t('team.act.deadBody')}</span>
            </div>
            <Link className="btn btn-primary btn-lg btn-block" href="/connexion">
              {t('act.toLogin')}
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
