import type { Store } from './store.ts';

/** Jour calendaire Europe/Paris, AAAA-MM-JJ. toISOString decalerait autour de minuit. */
export function parisCalendarDay(now: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Paris',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

/** HH:MM en heure Europe/Paris. */
export function parisClock(now: Date): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Paris',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);
  const hour = parts.find((part) => part.type === 'hour')?.value ?? '00';
  const minute = parts.find((part) => part.type === 'minute')?.value ?? '00';
  return `${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`;
}

/**
 * Un badge dans la journee = une ligne. Le second appel le meme jour ne cree rien.
 * `source` distingue la vente boutique (`shop`) et la fiche (`badge`).
 */
export async function recordDailyPassage(store: Store, profileId: string, now: Date, source: string): Promise<boolean> {
  return store.insertPassageIfNewDay({
    profile_id: profileId,
    day: parisCalendarDay(now),
    source,
  });
}
