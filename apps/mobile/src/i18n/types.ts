import type { fr } from './fr';

/** Même arbre que le français, chaque feuille est une chaîne : une clé oubliée en anglais ne compile pas. */
export type Leaves<T> = { [K in keyof T]: T[K] extends string ? string : Leaves<T[K]> };

export type Translation = Leaves<typeof fr>;

/** « home.hello », « messages.subject.acces »… toutes les clés valides. */
export type Path<T, P extends string = ''> = {
  [K in keyof T & string]: T[K] extends string ? `${P}${K}` : Path<T[K], `${P}${K}.`>;
}[keyof T & string];
