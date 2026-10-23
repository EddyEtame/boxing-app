import type { MessageKey, Translate } from '@/i18n/messages';

/**
 * Un code d'erreur des règles (`clé` ou `clé:max=90` ou `clé:min=1,max=999`)
 * en phrase de l'interface. Un code inconnu reste lisible plutôt que vide.
 */
export function errorText(t: Translate, code: string): string {
  const [key, raw] = code.split(':') as [string, string | undefined];
  const vars: Record<string, string | number> = {};
  for (const pair of (raw ?? '').split(',')) {
    const [k, v] = pair.split('=');
    if (k && v !== undefined) vars[k] = Number.isFinite(Number(v)) ? Number(v) : v;
  }
  return t(key as MessageKey, vars);
}

export function translateErrors(t: Translate, errs: Record<string, string>): Record<string, string> {
  return Object.fromEntries(Object.entries(errs).map(([field, code]) => [field, errorText(t, code)]));
}
