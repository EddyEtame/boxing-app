import { useEffect, useState } from 'react';

import { lireActualites, lireEvenements } from '@/lib/admin-api';

/**
 * Combats, galas, stages et resultats publies dans l'admin Boxing Center.
 * Pas de flux exterieur : si rien n'est publie, la liste est vide.
 */
export type Combat = {
  id: string;
  titre: string;
  date: string;
  resume: string;
  source: string;
  lien: string;
  photo: string | null;
};

export type CombatsState = { items: Combat[]; origine: 'club' | 'vide'; luA: Date | null };

export function useCombats(): CombatsState {
  const [state, setState] = useState<CombatsState>({ items: [], origine: 'vide', luA: null });
  useEffect(() => {
    let cancelled = false;
    Promise.all([lireEvenements().catch(() => null), lireActualites().catch(() => null)]).then(([events, news]) => {
      if (cancelled) return;
      const fromEvents: Combat[] = (events?.items ?? [])
        .filter((e) => e.kind === 'combat' || e.kind === 'gala' || e.kind === 'stage' || e.kind === 'competition')
        .map((e) => ({
          id: e.id,
          titre: e.fight ? `${e.fight.fighter} - ${e.fight.opponent}` : e.title,
          date: e.startsAt.slice(0, 10),
          resume: e.body,
          source: 'Boxing Center',
          lien: e.ticketUrl ?? '',
          photo: e.photo?.url ?? null,
        }));
      const fromNews: Combat[] = (news?.items ?? [])
        .filter((n) => n.kind === 'resultat')
        .map((n) => ({
          id: n.id,
          titre: n.title,
          date: n.date,
          resume: n.body,
          source: 'Boxing Center',
          lien: n.link?.url ?? '',
          photo: n.photo?.url ?? null,
        }));
      const items = [...fromEvents, ...fromNews].sort((a, b) => b.date.localeCompare(a.date));
      setState({ items, origine: items.length ? 'club' : 'vide', luA: new Date() });
    });
    return () => {
      cancelled = true;
    };
  }, []);
  return state;
}
