import type { MessageKey } from '@/i18n/messages';

/** Les motifs d'annulation et de fermeture que l'admin connaît (server/planning.ts : MOTIFS_ANNULATION). */
const KNOWN = ['coach-absent', 'salle', 'ferie', 'evenement', 'vacances', 'autre'];

/** « ferie · Noël » → « Jour férié · Noël » : le code traduit, la précision telle qu'écrite. */
export function motifLabel(t: (k: MessageKey) => string, raw: string): string {
  const [code, ...rest] = raw.split(' · ');
  const head = KNOWN.includes(code) ? t(`planning.motif.${code}` as MessageKey) : code;
  return [head, ...rest].join(' · ');
}
