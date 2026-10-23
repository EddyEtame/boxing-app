import type { IndexEntry } from '@/components/shell/Palette';
import { CLUB_LABEL } from '@/lib/clubs';
import { can, inScope } from '@/lib/permissions';
import { heure } from '@/lib/planning/model';
import { listAccounts } from '@/server/accounts';
import { read } from '@/server/collections';
import { readPlanning } from '@/server/planning';
import { getSession } from '@/server/session';

const JOURS = ['lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.', 'dim.'];

/**
 * L'index de la palette (Ctrl K) : de quoi retrouver un contenu, un cours, un
 * fil ou un compte en tapant trois lettres. Seulement ce que la personne a le
 * droit d'ouvrir, dans son périmètre ; jamais une adresse e-mail.
 */
export async function GET() {
  const user = await getSession();
  if (!user) return Response.json({ entries: [] }, { status: 401, headers: { 'cache-control': 'no-store' } });
  const entries: IndexEntry[] = [];

  if (can(user, 'actualites')) {
    for (const n of await read('actualites')) entries.push({ group: 'content', id: `news:${n.id}`, title: n.title, meta: `Actualité · ${n.status}`, href: `/actualites?ouvrir=${encodeURIComponent(n.id)}`, icon: 'news' });
  }
  if (can(user, 'evenements')) {
    for (const e of await read('evenements')) entries.push({ group: 'content', id: `event:${e.id}`, title: e.title, meta: `Événement · ${e.startsAt.slice(0, 10)}`, href: `/evenements?ouvrir=${encodeURIComponent(e.id)}`, icon: 'ticket' });
  }
  if (can(user, 'videos')) {
    for (const v of await read('videos')) entries.push({ group: 'content', id: `video:${v.id}`, title: v.title, meta: `Vidéo n° ${v.numero} · ${v.niveau}`, href: `/videos?ouvrir=${encodeURIComponent(v.id)}`, icon: 'play' });
  }
  if (can(user, 'plannings')) {
    const st = await readPlanning();
    for (const s of st.slots) {
      entries.push({
        group: 'slots',
        id: s.id,
        title: s.activite,
        meta: `${CLUB_LABEL[s.club]}${s.espace ? ` (${s.espace})` : ''} · ${JOURS[s.jour]} ${heure(s.debut)}–${heure(s.fin)}${s.coach && s.coach !== 'ACCES LIBRE' ? ` · ${s.coach}` : ''}`,
        href: `/plannings?club=${s.club}&cours=${encodeURIComponent(s.id)}`,
        icon: 'planning',
      });
    }
  }
  if (can(user, 'messagerie')) {
    for (const th of await read('messagerie')) {
      if (!inScope(user, th.member.club)) continue;
      entries.push({ group: 'threads', id: th.id, title: th.member.name, meta: `${CLUB_LABEL[th.member.club]} · ${th.sujet} · ${th.status}`, href: `/messages?fil=${encodeURIComponent(th.id)}`, icon: 'chat' });
    }
  }
  if (can(user, 'comptes')) {
    for (const a of await listAccounts()) entries.push({ group: 'accounts', id: a.id, title: a.name, meta: `${a.role} · ${a.status}`, href: `/comptes?compte=${encodeURIComponent(a.id)}`, icon: 'users' });
  }

  return Response.json({ entries }, { headers: { 'cache-control': 'no-store' } });
}
