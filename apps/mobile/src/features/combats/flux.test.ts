import assert from 'node:assert/strict';
import test from 'node:test';

import { COMBATS_INSTANTANE, COMBATS_SOURCES } from '../../data/combats.ts';
import { lireArticles } from './flux.ts';

const [, combatBoxe, ufc, , thaii] = COMBATS_SOURCES;
const signal = () => new AbortController().signal;
const schema = (value: unknown) => `<script type="application/ld+json">${JSON.stringify(value)}</script>`;

test('le RSS conserve le média, la date et le texte sans balises', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => new Response(`
    <rss><channel>
      <item><title><![CDATA[Boxe &amp; MMA]]></title><link>https://ufc.fr/combat/</link>
        <pubDate>Sun, 01 Nov 2026 10:00:00 GMT</pubDate>
        <description><![CDATA[<p>Le résultat &#x26; la suite.</p>]]></description></item>
      <item><title>Autre site</title><link>https://example.com/combat</link></item>
      <item><title>Lien non HTTP</title><link>blob:https://ufc.fr/combat</link></item>
    </channel></rss>`));
  assert.deepEqual(await lireArticles(ufc, signal()), [{
    titre: 'Boxe & MMA', lien: 'https://ufc.fr/combat/', date: '2026-11-01', resume: 'Le résultat & la suite.', source: 'ufc.fr',
  }]);
});

test('l’index de Combat Boxe continue si un de ses articles est indisponible', async (t) => {
  const index = schema({ '@graph': [{ '@type': 'CollectionPage', mainEntity: { itemListElement: [{ url: '/gala' }, { url: '/indisponible' }] } }] });
  const article = schema({ '@type': 'Article', headline: 'Résultats du gala', datePublished: '2026-11-16T08:00:00Z' });
  t.mock.method(globalThis, 'fetch', async (url: string) => {
    if (url === combatBoxe.url) return new Response(index);
    if (url === 'https://combat-boxe.com/gala') return new Response(article);
    return new Response(null, { status: 404 });
  });
  assert.deepEqual(await lireArticles(combatBoxe, signal()), [{
    titre: 'Résultats du gala', lien: 'https://combat-boxe.com/gala', date: '2026-11-16', resume: '', source: 'combat-boxe.com',
  }]);
});

test('le sitemap d’Actu Thaii retient les articles et la date de publication', async (t) => {
  const articleUrl = 'https://www.boxe-thai.com/article/guide';
  const demandes: string[] = [];
  t.mock.method(globalThis, 'fetch', async (url: string) => {
    demandes.push(url);
    if (url === thaii.url) return new Response(`<urlset>
      <url><loc>https://www.boxe-thai.com/clubs</loc></url>
      <url><loc>https://example.com/article/ailleurs</loc></url>
      <url><loc>${articleUrl}</loc><lastmod>2026-11-16</lastmod></url>
    </urlset>`);
    return new Response(schema({ '@type': 'NewsArticle', headline: 'Guide du muay thaï', datePublished: '2026-09-22', dateModified: '2026-11-16' }));
  });
  const articles = await lireArticles(thaii, signal());
  assert.deepEqual(demandes, [thaii.url, articleUrl]);
  assert.equal(articles[0]?.date, '2026-09-22');
  assert.equal(articles[0]?.source, thaii.id);
});

test('chaque média a une sélection embarquée', () => {
  assert.deepEqual(new Set(COMBATS_INSTANTANE.map(({ source }) => source)), new Set(COMBATS_SOURCES.map(({ id }) => id)));
});
