/** 06 12 34 56 78, +33, 0033 vers +33612345678. null si le numero n'est pas francais. */
export function normaliserTelephone(saisie: string): string | null {
  let digits = saisie.replace(/[^\d]/g, '');
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.startsWith('0') && digits.length === 10) digits = `33${digits.slice(1)}`;
  if (digits.startsWith('33') && digits.length === 11) return `+${digits}`;
  return null;
}

/** JJ/MM/AAAA vers AAAA-MM-JJ, ou null si la date n'existe pas ou est dans le futur. */
export function dateVersIso(saisie: string): string | null {
  const m = saisie.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  const jour = Number(m[1]);
  const mois = Number(m[2]);
  const annee = Number(m[3]);
  if (annee < 1900 || mois < 1 || mois > 12 || jour < 1 || jour > 31) return null;
  const date = new Date(annee, mois - 1, jour);
  if (date.getFullYear() !== annee || date.getMonth() !== mois - 1 || date.getDate() !== jour) return null;
  const aujourdhui = new Date();
  aujourdhui.setHours(23, 59, 59, 999);
  if (date > aujourdhui) return null;
  return `${annee}-${String(mois).padStart(2, '0')}-${String(jour).padStart(2, '0')}`;
}
