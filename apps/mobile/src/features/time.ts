const JOURS = ['DIM', 'LUN', 'MAR', 'MER', 'JEU', 'VEN', 'SAM'];
const MOIS = ['JAN', 'FÉV', 'MAR', 'AVR', 'MAI', 'JUIN', 'JUIL', 'AOÛT', 'SEPT', 'OCT', 'NOV', 'DÉC'];
const MOIS_LONGS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

/** « SAM 17 OCT » */
export function dateLine(d: Date): string {
  return `${JOURS[d.getDay()]} ${d.getDate()} ${MOIS[d.getMonth()]}`;
}

export function dateLineFromIso(iso: string): string {
  return dateLine(new Date(iso + 'T12:00:00'));
}

/** « 17 octobre 2026 » */
export function dateLong(iso: string): string {
  const d = new Date(iso + 'T12:00:00');
  return `${d.getDate()} ${MOIS_LONGS[d.getMonth()]} ${d.getFullYear()}`;
}

export function moisLabel(d: Date): string {
  return MOIS_LONGS[d.getMonth()];
}

export function moisCourt(iso: string): string {
  const d = new Date(iso + 'T12:00:00');
  return `${MOIS[d.getMonth()]} ${d.getFullYear()}`;
}

/** Numéro de semaine ISO. */
export function isoWeek(d: Date): number {
  const x = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = x.getUTCDay() || 7;
  x.setUTCDate(x.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(x.getUTCFullYear(), 0, 1));
  return Math.ceil(((x.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

/** « 42 min », « 3 h 20 », « 2 j 4 h » — ce qui reste avant un événement. */
export function formatIn(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h < 24) return m ? `${h} h ${String(m).padStart(2, '0')}` : `${h} h`;
  const j = Math.floor(h / 24);
  const hr = h % 24;
  return hr ? `${j} j ${hr} h` : `${j} j`;
}

/** Jours jusqu’à une date ISO (arrondi au jour). */
export function daysUntil(iso: string, now = new Date()): number {
  const d = new Date(iso + 'T00:00:00');
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((d.getTime() - today.getTime()) / 86400000);
}

export function euros(n: number): string {
  return n.toFixed(2).replace('.', ',') + ' €';
}

/* ------------------------------------------------------------------ */
/* Formats selon la langue choisie (20/10/2026)                         */
/* ------------------------------------------------------------------ */

type Lang = 'fr' | 'en';

/** Lundi en premier (index du planning : 0 = lundi). */
export const WEEKDAYS: Record<Lang, readonly string[]> = {
  fr: ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'],
  en: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
};

export const WEEKDAYS_SHORT: Record<Lang, readonly string[]> = {
  fr: ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'],
  en: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
};

/** Un jour au milieu d'une phrase : « lundi » en français, « Monday » en anglais. */
export function weekdayIn(jour: number, lang: Lang): string {
  const d = WEEKDAYS[lang][jour];
  return lang === 'fr' ? d.toLowerCase() : d;
}

/** « Aujourd’hui », « Demain » ou le jour de la semaine ; `mid` pour le milieu d'une phrase. */
export function relativeDay(offset: number, jour: number, lang: Lang, mid = false): string {
  if (offset === 0) return lang === 'en' ? (mid ? 'today' : 'Today') : mid ? 'aujourd’hui' : 'Aujourd’hui';
  if (offset === 1) return lang === 'en' ? (mid ? 'tomorrow' : 'Tomorrow') : mid ? 'demain' : 'Demain';
  return mid ? weekdayIn(jour, lang) : WEEKDAYS[lang][jour];
}

const MONTHS: Record<Lang, readonly string[]> = {
  fr: MOIS_LONGS,
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
};

const MONTHS_SHORT: Record<Lang, readonly string[]> = {
  fr: ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'],
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
};

function mondayIndex(d: Date): number {
  return (d.getDay() + 6) % 7;
}

/** « Mardi 20 octobre » · « Tuesday 20 October » */
export function fullDay(d: Date, lang: Lang): string {
  return `${WEEKDAYS[lang][mondayIndex(d)]} ${d.getDate()} ${MONTHS[lang][d.getMonth()]}`;
}

/** « 20 oct. » · « 20 Oct » */
export function shortDay(iso: string, lang: Lang): string {
  const d = new Date(iso.length > 10 ? iso : iso + 'T12:00:00');
  return `${d.getDate()} ${MONTHS_SHORT[lang][d.getMonth()]}`;
}

/** « 24 octobre 2026 » · « 24 October 2026 » */
export function longDate(iso: string, lang: Lang): string {
  const d = new Date(iso + 'T12:00:00');
  return `${d.getDate()} ${MONTHS[lang][d.getMonth()]} ${d.getFullYear()}`;
}

export function monthName(d: Date, lang: Lang): string {
  return MONTHS[lang][d.getMonth()];
}

/** « 2 h 10 », « 42 min », « 3 j » — la langue ne change que l'unité des jours. */
export function duree(minutes: number, lang: Lang): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h < 24) return m ? `${h} h ${String(m).padStart(2, '0')}` : `${h} h`;
  const j = Math.floor(h / 24);
  const unit = lang === 'en' ? 'd' : 'j';
  return `${j} ${unit}`;
}

/** Heure d'un horodatage ISO : « 14:20 ». */
export function clock(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** « Aujourd'hui », « Hier », sinon « 12 oct. ». */
export function dayLabel(iso: string, now: Date, lang: Lang): string {
  const d = new Date(iso);
  const a = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const b = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const diff = Math.round((b - a) / 86400000);
  if (diff === 0) return lang === 'en' ? 'Today' : 'Aujourd’hui';
  if (diff === 1) return lang === 'en' ? 'Yesterday' : 'Hier';
  return `${d.getDate()} ${MONTHS_SHORT[lang][d.getMonth()]}`;
}
