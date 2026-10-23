import { CLUB_LABEL, isClubId } from '@/lib/clubs';
import { toCsv, todayLocal } from '@/lib/format';
import { can } from '@/lib/permissions';
import { duree, heure, normaliseActivite } from '@/lib/planning/model';
import { audit } from '@/server/audit';
import { readPlanning } from '@/server/planning';
import { getSession } from '@/server/session';

const JOURS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

/** Le planning d'un club (ou du réseau) en CSV, avec les coachs : réservé à l'équipe, et noté au journal. */
export async function GET(request: Request) {
  const user = await getSession();
  if (!user || !can(user, 'plannings')) return new Response('Refusé', { status: user ? 403 : 401 });
  const wanted = new URL(request.url).searchParams.get('club');
  const club = isClubId(wanted) ? wanted : null;
  const st = await readPlanning();
  const today = todayLocal();
  const slots = st.slots.filter((s) => !club || s.club === club).sort((a, b) => a.club.localeCompare(b.club) || a.jour - b.jour || a.debut - b.debut);
  const rows: unknown[][] = [
    ['Club', 'Espace', 'Jour', 'Début', 'Fin', 'Durée', 'Activité (affiche)', 'Activité (app)', 'Famille', 'Coach', 'Annulations à venir'],
    ...slots.map((s) => {
      const a = normaliseActivite(s.activite);
      const cancels = st.exceptions.filter((e) => e.slotId === s.id && e.date >= today).map((e) => e.date);
      return [CLUB_LABEL[s.club], s.espace ?? '', JOURS[s.jour], heure(s.debut), heure(s.fin), duree(s.fin - s.debut), s.activite, a.libelle, a.famille, s.coach ?? '', cancels.join(' ')];
    }),
  ];
  await audit(user, 'planning.export', club ?? 'reseau', `${slots.length} créneaux`);
  return new Response(toCsv(rows), {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="planning-${club ?? 'reseau'}-${today}.csv"`,
      'cache-control': 'no-store',
    },
  });
}
