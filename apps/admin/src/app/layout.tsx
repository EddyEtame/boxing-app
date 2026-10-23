import type { Metadata, Viewport } from 'next';
import { Bebas_Neue, IBM_Plex_Mono, Montserrat } from 'next/font/google';
import { cookies, headers } from 'next/headers';
import type { ReactNode } from 'react';

import { I18nProvider } from '@/i18n/client';
import { messagesFor } from '@/i18n/messages';
import { getLocale } from '@/i18n/server';
import { parseThemePref, THEME_COOKIE, THEME_CSS } from '@/lib/theme-css';

import '@/styles/base.css';
import '@/styles/ui.css';
import '@/styles/shell.css';
import '@/styles/wizard.css';
import '@/styles/phone.css';
import '@/styles/data.css';
import '@/styles/planning.css';
import '@/styles/content.css';
import '@/styles/comms.css';
import '@/styles/team.css';
import '@/styles/system.css';

/**
 * Les trois voix de la charte (packages/brand) : Bebas Neue pour les titres
 * d'affiche, Montserrat pour tout le texte, IBM Plex Mono pour les heures,
 * numéros et codes. Servies depuis l'admin (next/font) : aucune requête vers
 * Google au moment où la page s'affiche.
 */
const display = Bebas_Neue({ weight: '400', subsets: ['latin', 'latin-ext'], variable: '--font-display', display: 'swap' });
const text = Montserrat({ subsets: ['latin', 'latin-ext'], variable: '--font-text', display: 'swap' });
const mono = IBM_Plex_Mono({ weight: ['400', '500', '600'], subsets: ['latin', 'latin-ext'], variable: '--font-mono', display: 'swap' });

export const metadata: Metadata = {
  title: { default: 'Administration · Boxing Center', template: '%s · Administration Boxing Center' },
  description: 'Interface d’administration de l’application Boxing Center.',
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
  applicationName: 'Boxing Center Admin',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#20254B' },
    { media: '(prefers-color-scheme: dark)', color: '#080B16' },
  ],
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const jar = await cookies();
  const theme = parseThemePref(jar.get(THEME_COOKIE)?.value);
  const locale = await getLocale();
  const nonce = (await headers()).get('x-nonce') ?? undefined;

  return (
    <html lang={locale} data-theme={theme} className={`${display.variable} ${text.variable} ${mono.variable}`}>
      <head>
        <style nonce={nonce} dangerouslySetInnerHTML={{ __html: THEME_CSS }} />
      </head>
      <body>
        <I18nProvider locale={locale} messages={messagesFor(locale)}>
          {children}
        </I18nProvider>
      </body>
    </html>
  );
}
