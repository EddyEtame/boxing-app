/**
 * Les règles du mot de passe d'un compte d'équipe, lues des deux côtés : le
 * navigateur les coche pendant la saisie, le serveur les revérifie avant
 * d'enregistrer. Douze caractères au moins (recommandation ANSSI pour un
 * compte sans second facteur), des lettres ET un chiffre ou un signe, rien de
 * la personne elle-même (nom, adresse), et une confirmation identique.
 */
export const PW_MIN = 12;
export const PW_MAX = 256;

export type PwChecks = { length: boolean; mix: boolean; personal: boolean; match: boolean };

/** Les morceaux de la personne qu'un mot de passe ne doit pas contenir (3 lettres et plus). */
export function personalParts(name: string, email: string): string[] {
  const local = email.split('@')[0] ?? '';
  const words = [...name.split(/[\s'’-]+/), ...local.split(/[._+\-\d]+/), local];
  return [...new Set(words.map((w) => w.trim().toLowerCase()).filter((w) => w.length >= 3))];
}

export function checkPassword(pw: string, confirm: string, personal: string[]): PwChecks {
  const lower = pw.toLowerCase();
  return {
    length: pw.length >= PW_MIN && pw.length <= PW_MAX,
    mix: /\p{L}/u.test(pw) && /[^\p{L}]/u.test(pw),
    personal: pw.length > 0 && !personal.some((p) => lower.includes(p)),
    match: pw.length > 0 && pw === confirm,
  };
}

export const passwordOk = (c: PwChecks) => c.length && c.mix && c.personal && c.match;

/** Ce qu'un attaquant essaie en premier : les mots du club et les suites de clavier. */
const COMMON = ['password', 'motdepasse', 'azerty', 'qwerty', '123456', 'abcdef', 'boxing', 'boxe', 'center', 'toulouse', 'admin', 'minimes', 'cyprien', 'ramonville', 'portet', 'etats', 'soleil', 'bonjour'];

/**
 * Une jauge de 0 à 4, honnête plutôt que flatteuse : la longueur compte le plus,
 * la variété ensuite ; une suite connue ou un caractère répété font reculer.
 */
export function strength(pw: string): 0 | 1 | 2 | 3 | 4 {
  if (!pw) return 0;
  const classes = [/\p{Ll}/u, /\p{Lu}/u, /\d/, /[^\p{L}\d]/u].filter((r) => r.test(pw)).length;
  let score = pw.length >= 20 ? 3 : pw.length >= 16 ? 2.5 : pw.length >= 12 ? 1.5 : pw.length >= 8 ? 0.5 : 0;
  score += (classes - 1) * 0.5;
  const lower = pw.toLowerCase();
  if (COMMON.some((w) => lower.includes(w))) score -= 1;
  if (/(.)\1{2,}/.test(pw)) score -= 0.5;
  if (/(0123|1234|2345|3456|4567|5678|6789|abcd|bcde|cdef)/i.test(pw)) score -= 0.5;
  return Math.max(0, Math.min(4, Math.round(score))) as 0 | 1 | 2 | 3 | 4;
}
