import { listAccounts } from './accounts';
import { checkConnections, type ConnId, type ConnState } from './branchements';
import { read, readFeatures } from './collections';
import { navCounts } from './counts';
import { readPlanning, sourceStatus } from './planning';
import { readEvents, usageReport } from './usage';
import { CLUB_IDS } from '@/lib/clubs';
import { todayLocal } from '@/lib/format';
import { can } from '@/lib/permissions';
import { planningChecks } from '@/lib/planning/checks';
import { isFree } from '@/lib/planning/model';
import type { ClubId, SessionUser } from '@/lib/types';

/**
 * AUJOURD'HUI — le tableau du matin. Tout se calcule ici, côté serveur, à
 * partir des mêmes données que les rubriques : un chiffre d'« Aujourd'hui » ne
 * peut pas dire autre chose que la page qu'il ouvre. Chaque bloc n'apparaît
 * que si le profil de la personne ouvre la rubrique correspondante.
 */
export type TodoId = 'messages' | 'moderation' | 'adherents' | 'planning' | 'source' | 'notifications' | 'contenus';
export type TodayClub = { club: ClubId; total: number; cancelled: number; next: { debut: number; fin: number; activite: string; espace?: string } | null; done: boolean };
export type FirstStep = { id: 'planning' | 'equipe' | 'actualite' | 'app' | 'demo' | 'fonctions'; done: boolean; href: string };

export type TodayData = {
  date: string;
  nowMin: number;
  todo: { id: TodoId; count: number; href: string; level: 'urgent' | 'normal' }[];
  clubs: TodayClub[] | null;
  vitrine: { visitors: number; visits: number; ctaRate: number; plannings: number; demoShare: number; perDay: { day: string; visits: number }[] } | null;
  connections: { id: ConnId; state: ConnState }[] | null;
  firstSteps: FirstStep[] | null;
};

function parisMinutes(d: Date): number {
  const parts = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(d);
  return Number(parts.find((p) => p.type === 'hour')?.value ?? 0) * 60 + Number(parts.find((p) => p.type === 'minute')?.value ?? 0);
}

export async function todayFor(user: SessionUser, now = new Date()): Promise<TodayData> {
  const date = todayLocal(now);
  const [y, m, d] = date.split('-').map(Number);
  const jour = (new Date(y, m - 1, d, 12).getDay() + 6) % 7;
  const nowMin = parisMinutes(now);
  const todo: TodayData['todo'] = [];

  const counts = await navCounts(user);
  if (counts.messages) todo.push({ id: 'messages', count: counts.messages, href: '/messages', level: 'urgent' });
  if (counts.moderation) todo.push({ id: 'moderation', count: counts.moderation, href: '/moderation', level: 'urgent' });
  if (counts.adherents) todo.push({ id: 'adherents', count: counts.adherents, href: '/adherents', level: 'urgent' });

  let clubs: TodayClub[] | null = null;
  if (can(user, 'plannings')) {
    const st = await readPlanning();
    const blocking = planningChecks(st.slots).filter((c) => c.level === 'bloquant').length;
    if (blocking && can(user, 'plannings.edit')) todo.push({ id: 'planning', count: blocking, href: '/plannings?vue=controles', level: 'urgent' });
    const src = await sourceStatus(st);
    if (src.kind !== 'identique' && can(user, 'plannings.edit')) todo.push({ id: 'source', count: 1, href: '/plannings', level: 'normal' });
    const cancelledToday = new Set(st.exceptions.filter((e) => e.date === date).map((e) => e.slotId));
    clubs = CLUB_IDS.map((club) => {
      const list = st.slots.filter((s) => s.club === club && s.jour === jour && !isFree(s)).sort((a, b) => a.debut - b.debut);
      const live = list.filter((s) => !cancelledToday.has(s.id));
      const next = live.find((s) => s.fin > nowMin) ?? null;
      return {
        club,
        total: list.length,
        cancelled: list.length - live.length,
        next: next ? { debut: next.debut, fin: next.fin, activite: next.activite, espace: next.espace } : null,
        done: list.length > 0 && !next,
      };
    });
  }

  if (can(user, 'notifications')) {
    const notifs = await read('notifications');
    const queued = notifs.filter((n) => n.status === 'en-file').length;
    if (queued) todo.push({ id: 'notifications', count: queued, href: '/notifications', level: 'normal' });
  }

  if (can(user, 'actualites')) {
    const [news, events] = await Promise.all([read('actualites'), read('evenements')]);
    const due = [...news, ...events].filter((x) => x.status === 'programme' && x.publishAt?.slice(0, 10) === date).length;
    if (due) todo.push({ id: 'contenus', count: due, href: '/actualites', level: 'normal' });
  }

  let vitrine: TodayData['vitrine'] = null;
  if (can(user, 'statistiques')) {
    const r = await usageReport(7, true, now);
    const g = r.guests;
    vitrine = {
      visitors: g.visitors,
      visits: g.visits,
      ctaRate: g.cta.rate,
      plannings: g.plannings.reduce((n, p) => n + p.views, 0),
      demoShare: r.totals.all ? r.totals.demo / r.totals.all : 0,
      perDay: g.perDay.map((p) => ({ day: p.day, visits: p.visits })),
    };
  }

  let connections: TodayData['connections'] = null;
  if (can(user, 'branchements')) {
    const report = await checkConnections(now.getTime());
    connections = report.items.map((c) => ({ id: c.id, state: c.state }));
  }

  let firstSteps: FirstStep[] | null = null;
  if (user.role === 'direction') {
    const [accounts, news, events, demo, features, st] = await Promise.all([listAccounts(), read('actualites'), readEvents(), read('demo'), readFeatures(), readPlanning()]);
    const steps: FirstStep[] = [
      { id: 'planning', done: Boolean(st.source.hash), href: '/plannings' },
      { id: 'equipe', done: accounts.length > 0, href: '/comptes?nouveau=1' },
      { id: 'actualite', done: news.some((n) => n.status === 'publie'), href: '/actualites?nouveau=1' },
      { id: 'app', done: events.some((e) => e.s === 'app'), href: '/branchements' },
      { id: 'demo', done: demo.updatedBy !== 'systeme', href: '/statistiques/demo' },
      { id: 'fonctions', done: Object.values(features).some((f) => Boolean(f.updatedAt)), href: '/fonctions' },
    ];
    firstSteps = steps.every((s) => s.done) ? null : steps;
  }

  const order = { urgent: 0, normal: 1 } as const;
  todo.sort((a, b) => order[a.level] - order[b.level]);
  return { date, nowMin, todo, clubs, vitrine, connections, firstSteps };
}
