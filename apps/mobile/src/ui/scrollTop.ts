/**
 * Retour en haut (23/10/2026, Eddy) : un toucher sur l'onglet d'une autre
 * rubrique y emmène ; un nouveau toucher sur l'onglet de la rubrique ouverte la
 * fait remonter tout en haut, comme sur iOS et dans WhatsApp.
 *
 * La page au premier plan s'inscrit ici quand elle prend le focus et se retire
 * quand elle le perd ; la barre d'onglets appelle `scrollActiveToTop`.
 */
type ScrollToTop = () => boolean;

let active: ScrollToTop | null = null;

export function registerScrollTop(fn: ScrollToTop): () => void {
  active = fn;
  return () => {
    if (active === fn) active = null;
  };
}

/** Vrai si la page a bougé (elle n'était pas déjà en haut). */
export function scrollActiveToTop(): boolean {
  return active ? active() : false;
}
