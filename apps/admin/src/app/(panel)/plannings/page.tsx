import type { Metadata } from 'next';

import type { SourceView } from './PlanningSide';
import { PlanningView } from './PlanningView';
import { VIEWS, type View } from '@/lib/planning/views';
import { CLUB_IDS, isClubId } from '@/lib/clubs';
import { todayLocal } from '@/lib/format';
import { can } from '@/lib/permissions';
import { mondayOf } from '@/lib/planning/model';
import type { ClubId } from '@/lib/types';
import { readPlanning, sourceStatus } from '@/server/planning';
import { requireUser } from '@/server/session';

export const metadata: Metadata = { title: 'Plannings' };

type Params = Promise<Record<string, string | string[] | undefined>>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function PlanningsPage({ searchParams }: { searchParams: Params }) {
  const user = await requireUser('plannings');
  const params = await searchParams;
  const state = await readPlanning();
  const status = await sourceStatus(state);
  const today = todayLocal();

  const canEdit = can(user, 'plannings.edit');
  const editable: ClubId[] = canEdit ? (user.clubs === 'all' ? CLUB_IDS : CLUB_IDS.filter((c) => (user.clubs as ClubId[]).includes(c))) : [];
  const wantedClub = one(params.club);
  const club: ClubId = isClubId(wantedClub) ? wantedClub : (editable[0] ?? 'minimes');
  const wantedView = one(params.vue);
  const view: View = (VIEWS as readonly string[]).includes(wantedView ?? '') ? (wantedView as View) : 'affiche';
  const wantedWeek = one(params.semaine);
  const week = wantedWeek && /^\d{4}-\d{2}-\d{2}$/.test(wantedWeek) ? mondayOf(wantedWeek) : mondayOf(today);
  const jourParam = Number(one(params.jour));

  const source: SourceView =
    status.kind === 'illisible'
      ? { kind: 'illisible', path: status.path, error: status.error }
      : status.kind === 'identique'
        ? { kind: 'identique', path: status.path, importedAt: status.importedAt, count: status.count, local: status.local.added.length + status.local.removed.length + status.local.changed.length }
        : { kind: 'diverge', path: status.path, importedAt: status.importedAt, added: status.app.added, removed: status.app.removed, changed: status.app.changed, conflicts: status.conflicts, local: status.local.added.length + status.local.removed.length + status.local.changed.length };

  return (
    <PlanningView
      slots={state.slots}
      exceptions={state.exceptions}
      history={state.history.slice(0, 120)}
      source={source}
      canEdit={canEdit}
      editable={editable}
      canTake={canEdit && user.clubs === 'all'}
      today={today}
      initial={{ club, espace: one(params.espace) ?? '', view, week, nouveau: one(params.nouveau) ?? null, coach: one(params.coach)?.slice(0, 40) ?? null, jour: Number.isInteger(jourParam) && jourParam >= 0 && jourParam <= 6 ? jourParam : null, slot: state.slots.some((s) => s.id === one(params.cours)) ? (one(params.cours) as string) : null }}
    />
  );
}
