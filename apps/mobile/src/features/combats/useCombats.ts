import { useEffect, useState } from 'react';

import { COMBATS_FLUX, COMBATS_INSTANTANE, type ArticleCombat } from '@/data/combats';
import { lireActualites, lireEvenements } from '@/lib/admin-api';

/**
 * L'actualité des combats (CDC §13) : ce que le club publie dans l'admin (galas,
 * stages, combats, résultats), puis l'actualité générale de la boxe et du MMA lue
 * en direct sur le flux RSS de actu-mma.com, avec l'instantané embarqué comme
 * repli : l'écran n'est jamais vide, et il dit toujours d'où vient ce qu'il montre.
 */
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

export type CombatsState = { items: Combat[]; origine: 'direct' | 'instantané'; luA: Date | null };

function decode(s: string): string {
  return s
    .replace(/<!\[CDATA\[(.*?)\]\]>/gs, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, '’')
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCharCode(Number(n)))
    .trim();
}

function tag(block: string, name: string): string {
  const m = block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`));
  return m ? decode(m[1]) : '';
}

export function parseRss(xml: string): ArticleCombat[] {
  const items = xml.match(/<item>[\s\S]*?<\/item>/g) ?? [];
  return items
    .slice(0, 12)
    .map((it) => {
      const pub = tag(it, 'pubDate');
      const d = pub ? new Date(pub) : null;
      return {
        titre: tag(it, 'title'),
        lien: tag(it, 'link'),
        date: d && !Number.isNaN(d.getTime()) ? d.toISOString().slice(0, 10) : '',
        resume: tag(it, 'description').replace(/<[^>]+>/g, '').slice(0, 220),
        source: 'actu-mma.com' as const,
      };
    })
    .filter((c) => c.titre && c.lien);
}

const versLigne = (a: ArticleCombat): Combat => ({ id: a.lien, titre: a.titre, date: a.date, resume: a.resume, source: a.source, lien: a.lien, photo: null, duClub: false });

export function useCombats(): CombatsState {
  const [club, setClub] = useState<Combat[]>([]);
  const [flux, setFlux] = useState<{ items: Combat[]; origine: CombatsState['origine']; luA: Date | null }>({ items: COMBATS_INSTANTANE.map(versLigne), origine: 'instantané', luA: null });

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
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    fetch(COMBATS_FLUX, { signal: controller.signal })
      .then((r) => (r.ok ? r.text() : Promise.reject(new Error(String(r.status)))))
      .then((xml) => {
        const items = parseRss(xml);
        if (!cancelled && items.length) setFlux({ items: items.map(versLigne), origine: 'direct', luA: new Date() });
      })
      .catch(() => undefined)
      .finally(() => clearTimeout(timer));
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, []);

  return { items: [...club, ...flux.items], origine: flux.origine, luA: flux.luA };
}
