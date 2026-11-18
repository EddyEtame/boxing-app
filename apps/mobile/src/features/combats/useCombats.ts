import { useEffect, useState } from 'react';

import { COMBATS_INSTANTANE, COMBATS_SOURCES, type ArticleCombat, type IdSourceCombats } from '@/data/combats';
import { lireActualites, lireEvenements } from '@/lib/admin-api';
import { configReady } from '@/lib/config';

import { lireArticles } from './flux';

export type Combat = {
  id: string;
  titre: string;
  date: string;
  resume: string;
  source: string;
  lien: string;
  photo: string | null;
  duClub: boolean;
};

type CombatsState = { items: Combat[]; lectures: Partial<Record<IdSourceCombats, Date>> };
const DELAI_FLUX_MS = 8_000;
const INTERVALLE_FLUX_MS = 5 * 60_000;
const releves = new Map<IdSourceCombats, { articles: ArticleCombat[]; luA: Date }>();
let rafraichissement: Promise<void> | undefined;
let dernierEssai = 0;

/** L’accueil et l’écran des combats partagent la lecture des médias. */
function actualiserSources(): Promise<void> {
  if (rafraichissement) return rafraichissement;
  if (Date.now() - dernierEssai < INTERVALLE_FLUX_MS) return Promise.resolve();
  dernierEssai = Date.now();

  const controleur = new AbortController();
  const timer = setTimeout(() => controleur.abort(), DELAI_FLUX_MS);
  rafraichissement = Promise.allSettled(COMBATS_SOURCES.map(async (source) => {
    const articles = await lireArticles(source, controleur.signal);
    if (articles.length) releves.set(source.id, { articles, luA: new Date() });
  })).then(() => undefined).finally(() => {
    clearTimeout(timer);
    rafraichissement = undefined;
  });
  return rafraichissement;
}

function lireReleves(): CombatsState {
  const lectures: CombatsState['lectures'] = {};
  const items = COMBATS_SOURCES.flatMap(({ id }) => {
    const releve = releves.get(id);
    if (releve && releve.luA.getTime() >= dernierEssai) lectures[id] = releve.luA;
    return releve?.articles ?? COMBATS_INSTANTANE.filter((article) => article.source === id);
  }).sort((a, b) => b.date.localeCompare(a.date));
  return { items: items.map((article) => ({ ...article, id: article.lien, photo: null, duClub: false })), lectures };
}

export function useCombats(): CombatsState {
  const [club, setClub] = useState<Combat[]>([]);
  const [flux, setFlux] = useState(lireReleves);

  useEffect(() => {
    if (!configReady) return undefined;
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
          duClub: true,
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
          duClub: true,
        }));
      setClub([...fromEvents, ...fromNews].sort((a, b) => b.date.localeCompare(a.date)));
    });
    void actualiserSources().then(() => {
      if (!cancelled) setFlux(lireReleves());
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return { items: [...club, ...flux.items], lectures: flux.lectures };
}
