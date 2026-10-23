import { cookies } from 'next/headers';

import { LOCALE_COOKIE, type Locale } from './core';
import { translator, type Translate } from './messages';

export async function getLocale(): Promise<Locale> {
  const value = (await cookies()).get(LOCALE_COOKIE)?.value;
  return value === 'en' ? 'en' : 'fr';
}

export async function getT(): Promise<{ t: Translate; locale: Locale }> {
  const locale = await getLocale();
  return { t: translator(locale), locale };
}
