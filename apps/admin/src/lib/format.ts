import type { Locale } from '@/i18n/core';
import type { Translate } from '@/i18n/messages';

/**
 * Dates et heures, toujours dans le fuseau du club (Europe/Paris) : un
 * adhérent lit l'heure de Toulouse, l'admin aussi, quel que soit l'ordinateur.
 */
export const TZ = 'Europe/Paris';
const tag = (l: Locale) => (l === 'fr' ? 'fr-FR' : 'en-GB');

export function fmtDate(locale: Locale, iso: string | Date, opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' }): string {
  const d = typeof iso === 'string' ? parseLocal(iso) : iso;
  if (Number.isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat(tag(locale), { timeZone: TZ, ...opts }).format(d);
}

export function fmtTime(locale: Locale, iso: string | Date): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  if (Number.isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat(tag(locale), { timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false }).format(d);
}

export function fmtDateTime(locale: Locale, iso: string): string {
  return `${fmtDate(locale, iso, { weekday: 'short', day: 'numeric', month: 'short' })} · ${fmtTime(locale, iso)}`;
}

/** « AAAA-MM-JJ » seul se lit à midi local (jamais la veille à cause d'UTC). */
export function parseLocal(s: string): Date {
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [y, m, d] = s.split('-').map(Number);
    return new Date(y!, (m ?? 1) - 1, d ?? 1, 12, 0, 0);
  }
  return new Date(s);
}

/**
 * « il y a 3 min », « hier à 18:02 »… `now` à null (rendu serveur, premier rendu
 * client) donne la date absolue : la même des deux côtés.
 */
export function relative(t: Translate, locale: Locale, iso: string, now: number | null = Date.now()): string {
  const at = new Date(iso).getTime();
  if (Number.isNaN(at)) return '—';
  if (now === null) return t('time.on', { date: fmtDateTime(locale, iso) });
  const diff = Math.round((now - at) / 1000);
  if (diff < 0) {
    const ahead = -diff;
    if (ahead < 120) return t('time.now');
    if (ahead < 3600) return t('time.inMinutes', { n: Math.max(1, Math.round(ahead / 60)) });
    if (ahead < 86400) return t('time.inHours', { n: Math.round(ahead / 3600) });
    return t('time.inDays', { n: Math.round(ahead / 86400) });
  }
  if (diff < 45) return t('time.now');
  if (diff < 3600) return t('time.minutes', { n: Math.max(1, Math.round(diff / 60)) });
  if (diff < 86400) return t('time.hours', { n: Math.round(diff / 3600) });
  if (diff < 172800) return t('time.yesterday', { time: fmtTime(locale, iso) });
  if (diff < 7 * 86400) return t('time.daysAgo', { n: Math.floor(diff / 86400) });
  return t('time.on', { date: fmtDate(locale, iso) });
}

/** Minutes depuis minuit → « 18h30 » (l'écriture des plannings du club) ou « 6:30 pm ». */
export function hhmm(min: number, locale: Locale = 'fr'): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (locale === 'en') return `${h}:${String(m).padStart(2, '0')}`;
  return m ? `${h}h${String(m).padStart(2, '0')}` : `${h}h`;
}

/** « 18:30 » → 1110 ; « 18h30 », « 18h » acceptés. Rien de lisible : null. */
export function parseHour(s: string): number | null {
  const m = /^\s*(\d{1,2})\s*[:hH]\s*(\d{0,2})\s*$/.exec(s);
  if (!m) return null;
  const h = Number(m[1]);
  const min = m[2] ? Number(m[2]) : 0;
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

export function todayLocal(now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
  return parts;
}

export function csvCell(v: unknown): string {
  const s = v === null || v === undefined ? '' : String(v);
  // Une cellule qui commence par = + - @ est neutralisée (injection de formule dans un tableur).
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return /[";\n,]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export function toCsv(rows: unknown[][]): string {
  return '﻿' + rows.map((r) => r.map(csvCell).join(';')).join('\r\n');
}
