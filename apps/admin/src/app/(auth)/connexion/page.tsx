import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { LoginForm } from './LoginForm';
import { LangToggle, ThemeToggle } from '@/components/Toggles';
import { getT } from '@/i18n/server';
import { configStatus } from '@/server/env';
import { getSession } from '@/server/session';

export const metadata: Metadata = { title: 'Connexion' };

/** Le chemin de retour après connexion : seulement un chemin interne (pas de redirection ouverte). */
function safeNext(value: string | string[] | undefined): string {
  const v = Array.isArray(value) ? value[0] : value;
  if (!v || !v.startsWith('/') || v.startsWith('//') || v.startsWith('/\\') || v.startsWith('/connexion')) return '/';
  return v.slice(0, 300);
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const next = safeNext(params.suite);
  if (await getSession()) redirect(next);
  const { t } = await getT();
  const cfg = configStatus();

  return (
    <div className="auth">
      <div className="auth-tools">
        <ThemeToggle compact />
        <LangToggle />
      </div>
      <section className="auth-art" aria-hidden="true">
        {/* Photo réelle du club (photothèque de l'app), jamais une image générée. */}
        {/* eslint-disable-next-line @next/next/no-img-element -- image locale servie par l'API média, sans optimisation */}
        <img className="auth-photo" src="/api/media/app/photos/minimes-ring-drapeau.jpg" alt="" />
        <div className="auth-caption">
          <p className="lower-third">{t('login.clubs')}</p>
          <p className="display">
            {t('login.poster1')}
            <br />
            {t('login.poster2')}
          </p>
        </div>
      </section>
      <main className="auth-form-wrap" id="contenu">
        <LoginForm next={next} config={cfg} expired={params.fin === '1'} />
      </main>
    </div>
  );
}
