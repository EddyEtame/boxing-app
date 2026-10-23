/**
 * Ce que renvoie une action serveur : jamais une exception qui traverse vers le
 * navigateur. `error` est un code (`err.<code>` dans le dictionnaire) ;
 * `fieldErrors` porte les messages par champ quand une saisie est refusée.
 */
export type ErrorCode = 'droits' | 'session' | 'invalide' | 'introuvable' | 'conflit' | 'interne';

export type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: ErrorCode; fieldErrors?: Record<string, string> };

export function ok<T>(data: T): ActionResult<T> {
  return { ok: true, data };
}

export function fail(error: ErrorCode, fieldErrors?: Record<string, string>): { ok: false; error: ErrorCode; fieldErrors?: Record<string, string> } {
  return fieldErrors ? { ok: false, error, fieldErrors } : { ok: false, error };
}
