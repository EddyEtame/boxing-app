import { useEffect, useState } from 'react';

import { COMBATS_FLUX, COMBATS_INSTANTANE, type Combat } from '@/data/combats';

/**
 * L’actualité des combats (CDC §13) lue en direct sur le flux RSS de
 * actu-mma.com, avec l’instantané embarqué comme repli : l’écran n’est jamais
 * vide, et il dit toujours d’où vient ce qu’il montre et depuis quand.
 */
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

export function parseRss(xml: string): Combat[] {
  const items = xml.match(/<item>[\s\S]*?<\/item>/g) ?? [];
  return items.slice(0, 12).map((it) => {
    const pub = tag(it, 'pubDate');
    const d = pub ? new Date(pub) : null;
    return {
      titre: tag(it, 'title'),
      lien: tag(it, 'link'),
      date: d && !Number.isNaN(d.getTime()) ? d.toISOString().slice(0, 10) : '',
      resume: tag(it, 'description').replace(/<[^>]+>/g, '').slice(0, 220),
      source: 'actu-mma.com' as const,
    };
  }).filter((c) => c.titre && c.lien);
}

export function useCombats(): CombatsState {
  const [state, setState] = useState<CombatsState>({ items: COMBATS_INSTANTANE, origine: 'instantané', luA: null });
  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    fetch(COMBATS_FLUX, { signal: controller.signal })
      .then((r) => (r.ok ? r.text() : Promise.reject(new Error(String(r.status)))))
      .then((xml) => {
        const items = parseRss(xml);
        if (!cancelled && items.length) setState({ items, origine: 'direct', luA: new Date() });
      })
      .catch(() => undefined)
      .finally(() => clearTimeout(timer));
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, []);
  return state;
}
