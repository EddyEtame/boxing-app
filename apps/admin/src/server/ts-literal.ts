/**
 * Lire un littéral dans un fichier TypeScript de l'app sans l'importer ni le
 * compiler : on découpe le texte, puis on n'évalue que ce morceau, dans un
 * contexte vide (planning.ts, app-clubs.ts).
 */

/** Le littéral `[ … ]` qui suit `marker`, en sautant chaînes et commentaires. */
export function extractArray(text: string, marker: string): string {
  const at = text.indexOf(marker);
  if (at < 0) throw new Error(`« ${marker} » introuvable dans le fichier`);
  const open = text.indexOf('[', text.indexOf('=', at));
  if (open < 0) throw new Error('tableau introuvable après « = »');
  let depth = 0;
  let quote: string | null = null;
  for (let i = open; i < text.length; i++) {
    const c = text[i];
    if (quote) {
      if (c === '\\') i++;
      else if (c === quote) quote = null;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') quote = c;
    else if (c === '/' && text[i + 1] === '/') {
      const nl = text.indexOf('\n', i);
      i = nl < 0 ? text.length : nl;
    } else if (c === '/' && text[i + 1] === '*') {
      const end = text.indexOf('*/', i + 2);
      i = end < 0 ? text.length : end + 1;
    } else if (c === '[') depth++;
    else if (c === ']' && --depth === 0) return text.slice(open, i + 1);
  }
  throw new Error('tableau non refermé');
}
