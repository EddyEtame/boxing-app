import { translator } from '@/i18n/messages';
import { toCsv } from '@/lib/format';
import { can } from '@/lib/permissions';
import { applyFilter, readFilter } from '@/lib/team/journal';
import { actionLabel } from '@/lib/team/labels';
import { audit, readAudit } from '@/server/audit';
import { getLocale } from '@/i18n/server';
import { getSession } from '@/server/session';

/**
 * Le journal en CSV (séparateur « ; », lisible par Excel en français), avec
 * les mêmes filtres que l'écran. L'export lui-même entre au journal.
 */
export async function GET(request: Request) {
  const user = await getSession();
  if (!user || !can(user, 'journal')) return new Response('Refusé', { status: user ? 403 : 401 });
  const url = new URL(request.url);
  const filter = readFilter(url.searchParams);
  const t = translator(await getLocale());
  const label = (a: string) => actionLabel(t, a);
  const rows = applyFilter(await readAudit(), filter, Date.now(), label);

  const csv = toCsv([
    ['date (UTC)', 'personne', 'profil', 'action', 'code', 'cible', 'détail'],
    ...rows.map((e) => [e.at, e.actor.name, e.actor.role, label(e.action), e.action, e.target ?? '', e.detail ?? '']),
  ]);
  await audit(user, 'journal.export', `${rows.length} lignes`, url.search.slice(0, 200) || undefined);
  const day = new Date().toISOString().slice(0, 10);
  return new Response(csv, {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="boxing-center-journal-${day}.csv"`,
      'cache-control': 'no-store',
    },
  });
}
