/**
 * L'heure de Toulouse, quel que soit l'ordinateur : une notification programmée
 * à « 18:30 » part à 18 h 30 heure des clubs, même saisie depuis un portable
 * réglé sur un autre fuseau. Aucun calcul de décalage à la main : Intl le donne,
 * y compris aux changements d'heure.
 */
const TZ = 'Europe/Paris';

const partsFmt = new Intl.DateTimeFormat('en-US', { timeZone: TZ, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });

function parisParts(ts: number): { y: number; mo: number; d: number; h: number; mi: number } {
  const parts = partsFmt.formatToParts(new Date(ts));
  const get = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  return { y: get('year'), mo: get('month'), d: get('day'), h: get('hour'), mi: get('minute') };
}

/** Décalage de Paris sur UTC à cet instant, en minutes (60 l'hiver, 120 l'été). */
function offsetMinutes(ts: number): number {
  const p = parisParts(ts);
  return Math.round((Date.UTC(p.y, p.mo - 1, p.d, p.h, p.mi) - Math.floor(ts / 60_000) * 60_000) / 60_000);
}

/** « 2026-10-24T18:30 » (heure de Toulouse) → ISO UTC ; null si la saisie n'est pas une date. */
export function parisToIso(local: string): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(local);
  if (!m) return null;
  const [y, mo, d, h, mi] = m.slice(1).map(Number) as [number, number, number, number, number];
  if (mo < 1 || mo > 12 || d < 1 || d > 31 || h > 23 || mi > 59) return null;
  const wall = Date.UTC(y, mo - 1, d, h, mi);
  let ts = wall - offsetMinutes(wall) * 60_000;
  ts = wall - offsetMinutes(ts) * 60_000;
  const back = parisParts(ts);
  // Une heure qui n'existe pas (le saut de mars) ne se programme pas.
  if (back.y !== y || back.mo !== mo || back.d !== d || back.h !== h || back.mi !== mi) return null;
  return new Date(ts).toISOString();
}

/** ISO → « 2026-10-24T18:30 », heure de Toulouse (pour un champ datetime-local). */
export function isoToParis(iso: string | number): string {
  const p = parisParts(typeof iso === 'number' ? iso : Date.parse(iso));
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${p.y}-${pad(p.mo)}-${pad(p.d)}T${pad(p.h)}:${pad(p.mi)}`;
}

/** L'heure de Toulouse (0–23) d'un instant. */
export function parisHour(iso: string | number): number {
  return parisParts(typeof iso === 'number' ? iso : Date.parse(iso)).h;
}

/** Entre 21 h et 8 h, une notification non essentielle réveille plus qu'elle n'informe. */
export function isQuietHour(iso: string | number): boolean {
  const h = parisHour(iso);
  return h >= 21 || h < 8;
}
