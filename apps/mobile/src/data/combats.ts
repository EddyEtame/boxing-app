import type { PhotoSource } from '@/ui/Photo';

/**
 * Actualité des combats (CDC §13). Source réelle : le flux RSS de actu-mma.com
 * (PRISE MMA, rédaction vérifiée sur source, propulsée par Boxing Center).
 * Instantané relevé le 2026-10-17 ; l’app rafraîchit le flux à l’ouverture
 * quand le réseau le permet (features/combats). La boxe anglaise arrivera avec
 * l’extension du pipeline.
 */
export type Combat = { titre: string; lien: string; date: string; resume: string; source: 'actu-mma.com' };

export const COMBATS_INSTANTANE: Combat[] = [
  {
    titre: "UFC Edmonton : Malott et Buckley passent la pesée",
    lien: "https://www.actu-mma.com/actualites/ufc-edmonton-malott-et-buckley-passent-la-pesee/",
    date: "2026-10-16",
    resume: "Mike Malott et Joaquin Buckley ont validé leur pesée avant l’UFC Edmonton. Les 26 combattants de la carte ont fait le poids.",
    source: "actu-mma.com"
  },
  {
    titre: "Muhammad Mokaev critique la stratégie de l’UFC après le départ de Farid Basharat",
    lien: "https://www.actu-mma.com/actualites/muhammad-mokaev-critique-la-strategie-de-l-ufc-apres-le-depart-de-farid-basharat/",
    date: "2026-10-16",
    resume: "Muhammad Mokaev défend Farid Basharat, récemment parti de l’UFC, et accuse la promotion de privilégier le divertissement à la performance sportive.",
    source: "actu-mma.com"
  },
  {
    titre: "Larissa Pacheco déplore l’absence d’offres des promotions de MMA",
    lien: "https://www.actu-mma.com/actualites/larissa-pacheco-deplore-l-absence-d-offres-des-promotions-de-mma/",
    date: "2026-10-16",
    resume: "L’ancienne championne de la PFL affirme n’avoir reçu d’offre ni de l’UFC ni d’autres promotions et dit vouloir retrouver un combat de MMA.",
    source: "actu-mma.com"
  },
  {
    titre: "Bo Nickal annonce le déplacement de son combat contre Joe Pyfer à Cleveland",
    lien: "https://www.actu-mma.com/actualites/bo-nickal-annonce-le-deplacement-de-son-combat-contre-joe-pyfer-a-cleveland/",
    date: "2026-10-16",
    resume: "Bo Nickal affirme que son combat contre Joe Pyfer est déplacé à février 2027 et sera en tête d’affiche d’un Fight Night à Cleveland.",
    source: "actu-mma.com"
  },
  {
    titre: "Au sud-est de Toulouse, le MMA se pratique dans un octogone de 7 m à Ramonville",
    lien: "https://www.actu-mma.com/actualites/mma-toulouse-sud-est-la-cage-de-7-m-de-ramonville/",
    date: "2026-10-16",
    resume: "Le Boxing Center Ramonville réunit sur 300 m² couverts un octogone de 7 mètres, un grand ring et des tatamis. Visite de la salle MMA du sud toulousain, cours par cours.",
    source: "actu-mma.com"
  },
  {
    titre: "Où pratiquer le MMA à Toulouse : le guide des salles, quartier par quartier",
    lien: "https://www.actu-mma.com/actualites/ou-pratiquer-le-mma-a-toulouse-le-guide-des-salles/",
    date: "2026-10-16",
    resume: "Six salles enseignent le MMA à Toulouse et dans sa banlieue. Cages, tatamis, cours débutants, jeunes : ce que chaque club publie, pour choisir la sienne.",
    source: "actu-mma.com"
  },
  {
    titre: "Boxing Center États-Unis : 400 m² de tatamis et une cage officielle au nord de Toulouse",
    lien: "https://www.actu-mma.com/actualites/etats-unis-400-m2-de-tatamis-et-une-cage-au-nord-de-toulouse/",
    date: "2026-10-16",
    resume: "Avenue des États-Unis, trois espaces de 400 m² réunissent une cage de MMA, deux rings et des tatamis. Ce que le club publie sur ses cours de MMA, de grappling et de JJB.",
    source: "actu-mma.com"
  },
  {
    titre: "Henry Cejudo estime qu’Alex Pereira a eu trop d’opportunités à l’UFC",
    lien: "https://www.actu-mma.com/actualites/henry-cejudo-estime-qu-alex-pereira-a-eu-trop-d-opportunites-a-l-ufc/",
    date: "2026-10-16",
    resume: "Henry Cejudo estime qu’Alex Pereira a bénéficié de trop d’opportunités à l’UFC et qu’il doit encore gagner des combats avant de viser le titre.",
    source: "actu-mma.com"
  },
  {
    titre: "PFL Chicago : Liz Carmouche et Jena Bishop se retrouvent pour le titre vacant",
    lien: "https://www.actu-mma.com/actualites/pfl-chicago-liz-carmouche-et-jena-bishop-se-retrouvent-pour-le-titre-vacant/",
    date: "2026-10-16",
    resume: "Liz Carmouche et Jena Bishop se retrouvent en tête de PFL Chicago, avec la ceinture vacante des 125 livres en jeu lors de leur revanche.",
    source: "actu-mma.com"
  },
  {
    titre: "Bulaid-Visconde en tête de la carte du DWCS",
    lien: "https://www.actu-mma.com/actualites/bulaid-visconde-en-tete-de-la-carte-du-dwcs/",
    date: "2026-10-13",
    resume: "MMA Fighting présente la carte du Dana White’s Contender Series à Las Vegas, avec Ilias Bulaid face à Erick Visconde en combat principal.",
    source: "actu-mma.com"
  }
];

export const COMBATS_FLUX = 'https://www.actu-mma.com/rss.xml';

export const COMBATS_PHOTO: PhotoSource = require('@/assets/photos/gala-impact.jpg');
