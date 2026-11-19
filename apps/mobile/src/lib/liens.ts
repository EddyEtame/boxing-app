/**
 * Les liens qui viennent du serveur (annonces, actualités, billetterie, documents, paiement, vidéos).
 * L'app ne les ouvre que s'ils sont sûrs : une adresse web en https, ou un écran connu de l'app.
 * Un `tel:`, un `intent:`, un schéma maison ou une adresse avec des identifiants ne s'ouvrent pas.
 */

/** L'adresse si elle est en https et sans identifiants avant l'hôte, sinon null. */
export function lienSur(url: string | null | undefined): string | null {
  if (typeof url !== 'string') return null;
  const adresse = url.trim();
  return /^https:\/\/[^\s/@]+(\/\S*)?$/i.test(adresse) ? adresse : null;
}

/** Les écrans qu'une annonce du back office peut viser. */
const ECRANS = new Set(['/', '/planning', '/badge', '/messages', '/entrainer', '/stats', '/abonnement', '/actualites', '/equipe', '/disciplines', '/combats', '/plus', '/alertes', '/notifications']);
/** Le back office nomme deux rubriques autrement que l'app. */
const ALIAS: Record<string, string> = { '/evenements': '/actualites', '/videos': '/entrainer' };

/** L'écran de l'app visé par ce chemin, ou null s'il n'est pas dans la liste. */
export function routeInterne(chemin: string): string | null {
  const route = ALIAS[chemin] ?? chemin;
  return ECRANS.has(route) ? route : null;
}
