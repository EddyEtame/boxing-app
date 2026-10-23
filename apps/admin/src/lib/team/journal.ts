import { familyOf, FAMILIES, type Family } from './labels';
import type { AuditEntry } from '@/lib/types';

/**
 * Les filtres du journal, appliqués pareil à l'écran et dans l'export CSV :
 * ce qu'on exporte est exactement ce qu'on voit.
 */
export const PERIODS = ['24h', '7j', '30j', 'tout'] as const;
export type Period = (typeof PERIODS)[number];

const SPAN: Record<Period, number> = { '24h': 86_400_000, '7j': 7 * 86_400_000, '30j': 30 * 86_400_000, tout: Infinity };

export type JournalFilter = { person: string; family: Family | 'all'; period: Period; q: string };

export const EMPTY_FILTER: JournalFilter = { person: 'all', family: 'all', period: 'tout', q: '' };

export function readFilter(params: { get(name: string): string | null }): JournalFilter {
  const family = params.get('famille');
  const period = params.get('periode');
  return {
    person: params.get('personne')?.slice(0, 80) || 'all',
    family: family && (FAMILIES as readonly string[]).includes(family) ? (family as Family) : 'all',
    period: period && (PERIODS as readonly string[]).includes(period) ? (period as Period) : 'tout',
    q: params.get('q')?.slice(0, 120) ?? '',
  };
}

export function filterQuery(f: JournalFilter): string {
  const p = new URLSearchParams();
  if (f.person !== 'all') p.set('personne', f.person);
  if (f.family !== 'all') p.set('famille', f.family);
  if (f.period !== 'tout') p.set('periode', f.period);
  if (f.q.trim()) p.set('q', f.q.trim());
  const s = p.toString();
  return s ? `?${s}` : '';
}

const fold = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

/** `label` traduit l'action pour que la recherche trouve « déplacé » autant que « planning.deplacement ». */
export function applyFilter(entries: AuditEntry[], f: JournalFilter, now: number | null, label: (action: string) => string): AuditEntry[] {
  const needle = fold(f.q.trim());
  const since = now === null || f.period === 'tout' ? -Infinity : now - SPAN[f.period];
  return entries.filter((e) => {
    if (f.person !== 'all' && e.actor.id !== f.person) return false;
    if (f.family !== 'all' && familyOf(e.action) !== f.family) return false;
    if (since > -Infinity && Date.parse(e.at) < since) return false;
    if (needle && !fold([e.actor.name, e.action, label(e.action), e.target ?? '', e.detail ?? ''].join(' ')).includes(needle)) return false;
    return true;
  });
}
