import type { ArticleCombat, SourceCombats } from '@/data/combats';

const LIMITE_RSS = 12;
const LIMITE_PAGES = 5;
const ENTITES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
type Schema = Record<string, unknown>;

function decode(valeur: string): string {
  return valeur.replace(/<!\[CDATA\[(.*?)\]\]>/gs, '$1').replace(/&(#x[\da-f]+|#\d+|\w+);/gi, (brut, entite: string) => {
    if (!entite.startsWith('#')) return Object.hasOwn(ENTITES, entite) ? ENTITES[entite] : brut;
    const hex = entite[1].toLowerCase() === 'x';
    const code = Number.parseInt(entite.slice(hex ? 2 : 1), hex ? 16 : 10);
    return code <= 0x10ffff ? String.fromCodePoint(code) : brut;
  });
}

function texte(valeur: unknown): string {
  if (typeof valeur !== 'string') return '';
  return decode(valeur).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function balise(xml: string, nom: string): string {
  return new RegExp(`<${nom}(?:\\s[^>]*)?>([\\s\\S]*?)</${nom}>`, 'i').exec(xml)?.[1] ?? '';
}

function dateIso(valeur: unknown): string {
  const horodatage = typeof valeur === 'string' ? Date.parse(valeur) : NaN;
  return Number.isFinite(horodatage) ? new Date(horodatage).toISOString().slice(0, 10) : '';
}

function lienEditeur(valeur: unknown, source: SourceCombats): string | null {
  if (typeof valeur !== 'string' || !valeur.trim()) return null;
  try {
    const lien = new URL(decode(valeur).trim(), source.url);
    if (lien.protocol !== 'https:' || lien.origin !== new URL(source.url).origin || lien.username || lien.password) return null;
    lien.hash = '';
    return lien.href;
  } catch {
    return null;
  }
}

function estObjet(valeur: unknown): valeur is Schema {
  return typeof valeur === 'object' && valeur !== null && !Array.isArray(valeur);
}

function noeudsSchema(valeur: unknown): Schema[] {
  if (Array.isArray(valeur)) return valeur.flatMap(noeudsSchema);
  if (estObjet(valeur)) return [valeur, ...noeudsSchema(valeur['@graph'])];
  return [];
}

function lireSchemas(html: string): Schema[] {
  return [...html.matchAll(/<script\b[^>]*\btype=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)].flatMap(([, json]) => {
    try {
      return noeudsSchema(JSON.parse(json));
    } catch {
      return [];
    }
  });
}

function articlesRss(xml: string, source: SourceCombats): ArticleCombat[] {
  const blocs = [...xml.matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/gi)];
  const articles = blocs.flatMap(([, bloc]) => {
    const titre = texte(balise(bloc, 'title'));
    const lien = lienEditeur(balise(bloc, 'link'), source);
    if (!titre || !lien) return [];
    return [{ titre, lien, date: dateIso(texte(balise(bloc, 'pubDate'))), resume: texte(balise(bloc, 'description')).slice(0, 220), source: source.id }];
  });
  return [...new Map(articles.map((article) => [article.lien, article])).values()].slice(0, LIMITE_RSS);
}

function liensCollection(html: string, source: SourceCombats): string[] {
  const liste = lireSchemas(html).find((schema) => schema['@type'] === 'CollectionPage')?.mainEntity;
  if (!estObjet(liste) || !Array.isArray(liste.itemListElement)) return [];
  const liens = liste.itemListElement.filter(estObjet).map((element) => lienEditeur(element.url, source));
  return [...new Set(liens.filter((lien) => lien !== null))];
}

function liensSitemap(xml: string, source: SourceCombats): string[] {
  const entrees = [...xml.matchAll(/<url\b[^>]*>([\s\S]*?)<\/url>/gi)].flatMap(([, bloc]) => {
    const lien = lienEditeur(balise(bloc, 'loc'), source);
    if (!lien || !new URL(lien).pathname.startsWith('/article/')) return [];
    return [{ lien, maj: dateIso(balise(bloc, 'lastmod').trim()) }];
  });
  return [...new Set(entrees.sort((a, b) => b.maj.localeCompare(a.maj)).map(({ lien }) => lien))];
}

function articlePage(html: string, lien: string, source: SourceCombats): ArticleCombat | null {
  const schema = lireSchemas(html).find((entree) => entree['@type'] === 'Article' || entree['@type'] === 'NewsArticle');
  const titre = texte(schema?.headline);
  const date = dateIso(schema?.datePublished);
  if (!titre || !date) return null;
  return { titre, date, lien, resume: texte(schema?.description).slice(0, 220), source: source.id };
}

async function lire(url: string, source: SourceCombats, signal: AbortSignal): Promise<string> {
  const reponse = await fetch(url, { signal, credentials: 'omit' });
  if (!reponse.ok || (reponse.url && !lienEditeur(reponse.url, source))) throw new Error(`Flux ${source.id} indisponible`);
  return reponse.text();
}

/** RSS quand l’éditeur en fournit un. Les deux autres publient des index et des métadonnées d’article. */
export async function lireArticles(source: SourceCombats, signal: AbortSignal): Promise<ArticleCombat[]> {
  const index = await lire(source.url, source, signal);
  if (source.format === 'rss') return articlesRss(index, source);

  const liens = source.format === 'collection' ? liensCollection(index, source) : liensSitemap(index, source);
  const pages = await Promise.allSettled(liens.slice(0, LIMITE_PAGES).map(async (lien) => articlePage(await lire(lien, source, signal), lien, source)));
  return pages.flatMap((page) => (page.status === 'fulfilled' && page.value ? [page.value] : []));
}
