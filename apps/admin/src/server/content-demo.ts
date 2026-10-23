import { newId } from './crypto';
import { todayParis } from '@/lib/content/rules';
import type { ClubEvent } from '@/lib/types';

/**
 * Des exemples d'événements, seulement sur demande depuis l'état vide : l'app
 * n'a pas d'événement à elle, et un calendrier vide ne montre rien de ce que
 * la rubrique sait faire. Chacun est marqué « démo », écrit « (exemple) » dans
 * son titre, et l'API publique ne les sert pas (sauf `?demo=1` pour tester
 * l'app). Les combats reprennent la forme du CDC §13 : « Boxeur A contre
 * Boxeur B ». Aucun fait inventé sur une personne réelle.
 */
function shift(ymd: string, days: number): string {
  const [y, m, d] = ymd.split('-').map(Number) as [number, number, number];
  const x = new Date(Date.UTC(y, m - 1, d + days));
  return x.toISOString().slice(0, 10);
}

/** Le prochain samedi après `ymd` + `minDays`. */
function saturdayAfter(ymd: string, minDays: number): string {
  let day = shift(ymd, minDays);
  for (let i = 0; i < 7; i++) {
    const [y, m, d] = day.split('-').map(Number) as [number, number, number];
    if (new Date(Date.UTC(y, m - 1, d)).getUTCDay() === 6) return day;
    day = shift(day, 1);
  }
  return day;
}

export function demoEvents(by: string, now = new Date()): ClubEvent[] {
  const today = todayParis(now);
  const stamp = now.toISOString();
  const base = { audience: 'tous' as const, status: 'publie' as const, publishedAt: stamp, important: false, demo: true, origin: 'admin' as const, createdAt: stamp, createdBy: by, updatedAt: stamp, updatedBy: by };
  const gala = saturdayAfter(today, 20);
  const open = saturdayAfter(today, 6);
  const stage = shift(today, 58);
  return [
    {
      ...base,
      id: newId('evt'),
      kind: 'gala',
      title: 'Fight Night de Portet (exemple)',
      body: 'Une soirée de gala dans la salle de combat de Portet : amateurs du réseau en première partie, combat principal en fin de soirée. Ouverture des portes à 18h30.',
      startsAt: `${gala}T19:00`,
      endsAt: `${gala}T23:30`,
      club: 'portet',
      photo: { kind: 'photo', file: 'gala-ring-foule.jpg', alt: 'Le public autour du ring pendant un gala' },
      ticketUrl: 'https://boutique.boxingcenter.fr/',
      fight: { fighter: 'Boxeur A', opponent: 'Boxeur B', weightClass: '-70 kg', title: 'Ceinture régionale' },
      important: true,
    },
    {
      ...base,
      id: newId('evt'),
      kind: 'portes-ouvertes',
      title: 'Portes ouvertes à Ramonville (exemple)',
      body: 'Une journée pour essayer la boxe anglaise, le kick et le MMA avec les coachs du club. Venez en tenue de sport, les gants sont prêtés.',
      startsAt: `${open}T10:00`,
      endsAt: `${open}T17:00`,
      club: 'ramonville',
      photo: { kind: 'photo', file: 'ramonville-cage-ring.jpg', alt: 'La cage et le ring de la salle de Ramonville' },
    },
    {
      ...base,
      id: newId('evt'),
      kind: 'stage',
      title: 'Stage enfants des vacances (exemple)',
      body: 'Cinq matinées de boxe éducative pour les 7–11 ans, encadrées par les coachs du club. Places limitées, inscription sur la boutique.',
      startsAt: `${stage}T09:30`,
      endsAt: `${shift(stage, 4)}T12:00`,
      club: 'minimes',
      photo: { kind: 'photo', file: 'minimes-groupe-elastiques.jpg', alt: 'Un groupe d’enfants à l’échauffement avec des élastiques' },
      ticketUrl: 'https://boutique.boxingcenter.fr/',
    },
    {
      ...base,
      id: newId('evt'),
      kind: 'combat',
      title: 'Boxeur A contre Boxeur B (exemple)',
      body: 'Le combat d’un boxeur du club, à suivre en direct. L’affiche reprend la forme prévue par le cahier des charges : boxeurs, date et lieu, catégorie, titre, diffusion.',
      startsAt: `${shift(today, 34)}T21:00`,
      club: null,
      venue: 'Salle de la ligue régionale (exemple)',
      photo: { kind: 'photo', file: 'gala-garde.jpg', alt: 'Un boxeur en garde sous les projecteurs' },
      fight: { fighter: 'Boxeur A', opponent: 'Boxeur B', weightClass: '-63,5 kg', title: 'Titre régional', broadcaster: 'Diffusion en direct (exemple)' },
    },
    {
      ...base,
      id: newId('evt'),
      kind: 'competition',
      title: 'Interclubs de boxe éducative (exemple)',
      body: 'Les jeunes du réseau se sont retrouvés pour leurs premiers assauts. Événement passé : il reste dans l’historique de l’app avec ses résultats.',
      startsAt: `${shift(today, -24)}T14:00`,
      endsAt: `${shift(today, -24)}T18:00`,
      club: 'saint-cyprien',
      photo: { kind: 'photo', file: 'minimes-ecole-ring.jpg', alt: 'Des enfants sur le ring pendant un cours de boxe éducative' },
    },
  ];
}
