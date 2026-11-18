/** Les médias de combat référencés dans le portfolio EAM (CDC §13). */
export const COMBATS_SOURCES = [
  { id: 'actu-mma.com', nom: 'Actu MMA', url: 'https://www.actu-mma.com/rss.xml', format: 'rss' },
  { id: 'combat-boxe.com', nom: 'Combat Boxe', url: 'https://combat-boxe.com/actualites', format: 'collection' },
  { id: 'ufc.fr', nom: 'UFC.FR', url: 'https://ufc.fr/feed.xml', format: 'rss' },
  { id: 'actu-boxe.com', nom: 'Actu Boxe', url: 'https://actu-boxe.com/feed.xml', format: 'rss' },
  { id: 'boxe-thai.com', nom: 'Actu Thaii', url: 'https://www.boxe-thai.com/sitemap.xml', format: 'sitemap' },
] as const;

export type SourceCombats = (typeof COMBATS_SOURCES)[number];
export type IdSourceCombats = SourceCombats['id'];
export type ArticleCombat = { titre: string; lien: string; date: string; resume: string; source: IdSourceCombats };

// Sélection embarquée par média. Les liens et dates des ajouts ont été vérifiés le 17 novembre 2026.
export const COMBATS_INSTANTANE: ArticleCombat[] = [
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
  },
  {
    titre: 'Camilleri affrontera Leek sur la carte de Melbourne',
    lien: 'https://combat-boxe.com/camilleri-leek-sous-carte-teremoana-ahio-melbourne-18-novembre-2026',
    date: '2026-11-17',
    resume: 'Le programme de la soirée Teremoana–Ahio prévoit dix reprises entre les deux poids moyens.',
    source: 'combat-boxe.com',
  },
  {
    titre: 'David Adeleye bat Flores sur décision',
    lien: 'https://combat-boxe.com/adeleye-bat-flores-decision-14-novembre-2026',
    date: '2026-11-16',
    resume: 'Le verdict du combat du 14 novembre est tombé après dix reprises.',
    source: 'combat-boxe.com',
  },
  {
    titre: 'Sheehy obtient une victoire à la décision face à Matias',
    lien: 'https://combat-boxe.com/callum-sheehy-bat-matias-decision-14-novembre-2026',
    date: '2026-11-16',
    resume: 'Combat Boxe revient sur le résultat de leur rencontre du 14 novembre.',
    source: 'combat-boxe.com',
  },
  {
    titre: 'Tom Nolan bat Renato Moicano par TKO',
    lien: 'https://ufc.fr/tom-nolan-bat-renato-moicano-ufc-1-novembre-2026/',
    date: '2026-11-06',
    resume: 'L’Australien a résisté aux tentatives de soumission avant de conclure au troisième round.',
    source: 'ufc.fr',
  },
  {
    titre: 'Cortes-Acosta affrontera Johnny Walker en tête d’affiche',
    lien: 'https://ufc.fr/ufc-cortes-acosta-walker-nouveau-main-event/',
    date: '2026-11-01',
    resume: 'Le combat devient l’affiche principale après le forfait sur blessure de Sean Brady.',
    source: 'ufc.fr',
  },
  {
    titre: 'Johnson Suffo revient sur ses sparrings avec Bakary Samaké',
    lien: 'https://actu-boxe.com/articles/johnson-suffo-sparring-bakary-samake-boxing-center-toulouse/',
    date: '2026-10-01',
    resume: 'L’entretien revient aussi sur son parcours professionnel et ses débuts dans la boxe toulousaine.',
    source: 'actu-boxe.com',
  },
  {
    titre: 'Bakary Samaké prépare son retour contre Uisma Lima',
    lien: 'https://actu-boxe.com/articles/bakary-samake-preparation-uisma-lima-las-vegas/',
    date: '2026-09-30',
    resume: 'Actu Boxe décrypte les ajustements à préparer après sa première défaite professionnelle.',
    source: 'actu-boxe.com',
  },
  {
    titre: 'Bien récupérer après une séance de boxe thaï',
    lien: 'https://www.boxe-thai.com/article/recuperation-apres-entrainement-boxe-thai',
    date: '2026-09-22',
    resume: 'Des conseils pour gérer la charge d’entraînement, le repos et l’hydratation.',
    source: 'boxe-thai.com',
  },
  {
    titre: 'Les cours de pieds-poings du Boxing Center à Toulouse',
    lien: 'https://www.boxe-thai.com/article/boxing-center-toulouse-portrait',
    date: '2026-09-15',
    resume: 'Actu Thaii présente les salles et les coachs de boxe thaï et de kick-boxing du réseau.',
    source: 'boxe-thai.com',
  },
  {
    titre: 'Les critères pour choisir un club de muay thaï',
    lien: 'https://www.boxe-thai.com/article/choisir-club-boxe-thai',
    date: '2026-09-14',
    resume: 'Encadrement, équipement, affiliation : les points à regarder lors d’une première visite.',
    source: 'boxe-thai.com',
  },
];
