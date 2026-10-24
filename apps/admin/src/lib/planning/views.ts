/** Les vues de la page Plannings : partagées entre la page serveur (lecture de `?vue=`) et la vue client. */
export const VIEWS = ['affiche', 'liste', 'horaires', 'reseau', 'controles', 'adherent'] as const;
export type View = (typeof VIEWS)[number];
