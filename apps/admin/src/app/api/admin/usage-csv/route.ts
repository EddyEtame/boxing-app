import { CLUB_LABEL } from '@/lib/clubs';
import { toCsv } from '@/lib/format';
import { can } from '@/lib/permissions';
import { audit } from '@/server/audit';
import { getSession } from '@/server/session';
import { usageReport } from '@/server/usage';

/** Les agrégats de la page « Statistiques » en CSV (séparateur « ; », lisible par Excel en français). Jamais un événement brut. */
export async function GET(request: Request) {
  const user = await getSession();
  if (!user || !can(user, 'statistiques')) return new Response('Refusé', { status: user ? 403 : 401 });
  const url = new URL(request.url);
  const asked = Number(url.searchParams.get('periode'));
  const period = [7, 30, 90].includes(asked) ? asked : 30;
  const includeDemo = url.searchParams.get('demo') !== '0';
  const r = await usageReport(period, includeDemo);

  const rows: unknown[][] = [
    ['Boxing Center — mesure d’usage', `${period} jours`, includeDemo ? 'démo incluse' : 'sans la démo', `du ${r.from.slice(0, 10)} au ${r.to.slice(0, 10)}`],
    [],
    ['Non-membres', 'visiteurs', r.guests.visitors, 'visites', r.guests.visits, 'clics « Créer mon compte »', r.guests.cta.clicks, 'taux', `${(r.guests.cta.rate * 100).toFixed(1)} %`],
    [],
    ['Entonnoir', 'visiteurs'],
    ...r.guests.funnel.map((f) => [f.key, f.value]),
    [],
    ['Jour', 'visites non-membres', 'visiteurs non-membres', 'visites adhérents', 'visiteurs adhérents'],
    ...r.guests.perDay.map((d, i) => [d.day, d.visits, d.visitors, r.members.perDay[i]?.visits ?? 0, r.members.perDay[i]?.visitors ?? 0]),
    [],
    ['Rubrique (non-membres)', 'vues', 'visiteurs'],
    ...r.guests.sections.map((s) => [s.key, s.views, s.visitors]),
    [],
    ['Planning (non-membres)', 'vues', 'visiteurs', 'partages', 'cours ouverts'],
    ...r.guests.plannings.map((p) => [CLUB_LABEL[p.club], p.views, p.visitors, p.shares, p.sessions]),
    [],
    ['Origine du clic « Créer mon compte »', 'clics'],
    ...r.guests.cta.from.map((f) => [f.key, f.count]),
    [],
    ['Adhérents', 'installations', r.members.visitors, 'actives', r.members.byStatut.actif, 'restreintes', r.members.byStatut.restreint],
    ['Geste (adhérents)', 'nombre', 'adhérents'],
    ...r.members.actions.map((a) => [a.key, a.count, a.visitors]),
  ];

  await audit(user, 'usage.export', `${period}j`);
  return new Response(toCsv(rows), {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="boxing-center-usage-${period}j-${r.to.slice(0, 10)}.csv"`,
      'cache-control': 'no-store',
    },
  });
}
