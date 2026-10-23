import type { MessageKey, Messages } from '@/i18n/messages';

import type { SectionId } from './nav';

/** Les clés d'aide d'une rubrique, lues dans le dictionnaire : intro, citation du CDC, étapes, règles. */
export function helpFor(section: SectionId, messages: Messages): { intro: MessageKey; cdc: MessageKey; steps: MessageKey[]; rules: MessageKey[] } {
  const prefix = `help.${section}`;
  const keys = Object.keys(messages) as MessageKey[];
  const pick = (kind: 's' | 'r') =>
    keys
      .filter((k) => new RegExp(`^${prefix.replace('.', '\\.')}\\.${kind}\\d+$`).test(k))
      .sort((a, b) => Number(a.slice(a.lastIndexOf(kind) + 1)) - Number(b.slice(b.lastIndexOf(kind) + 1)));
  return { intro: `${prefix}.intro` as MessageKey, cdc: `${prefix}.cdc` as MessageKey, steps: pick('s'), rules: pick('r') };
}
