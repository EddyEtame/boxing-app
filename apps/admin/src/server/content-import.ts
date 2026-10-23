import { promises as fs } from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

import { readNews, readVideos } from './content';
import { displayPath, mobilePath } from './paths';
import { isClubId } from '@/lib/clubs';
import { isFamilleVideo, isNiveau, isObjectif, isSecurite } from '@/lib/content/enums';
import type { ImportPreview } from '@/lib/content/types';
import type { NewsItem, NewsKind, VideoItem } from '@/lib/types';

/**
 * « REPRENDRE LE CONTENU DE L'APP » (CDC §8 : éviter les doubles saisies).
 * L'app montre aujourd'hui des actualités et des vidéos écrites dans son code
 * (apps/mobile/src/data). On les lit sans jamais y écrire : seul le tableau
 * littéral est évalué, dans un contexte vide et limité dans le temps ; les
 * `require(...)` de photos deviennent le nom du fichier de la photothèque.
 */

const PHOTO = Symbol('photo');
type PhotoRef = { [PHOTO]: string };
const isPhoto = (v: unknown): v is PhotoRef => typeof v === 'object' && v !== null && PHOTO in v;

/** Le littéral `[ … ]` qui suit `marker`, en sautant chaînes et commentaires. */
function extractArray(text: string, marker: string): string {
  const at = text.indexOf(marker);
  if (at < 0) throw new Error(`« ${marker} » introuvable`);
  const open = text.indexOf('[', text.indexOf('=', at));
  if (open < 0) throw new Error('tableau introuvable');
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

async function evalArray(file: string, marker: string): Promise<unknown[]> {
  const text = await fs.readFile(file, 'utf8');
  const literal = extractArray(text, marker);
  const sandbox = Object.create(null) as Record<string, unknown>;
  sandbox.require = (p: unknown) => ({ [PHOTO]: path.basename(String(p)) }) satisfies PhotoRef;
  const value: unknown = vm.runInNewContext(`(${literal})`, sandbox, { timeout: 500 });
  if (!Array.isArray(value)) throw new Error('pas un tableau');
  return value;
}

const str = (v: unknown, max = 400): string | null => (typeof v === 'string' && v.trim() && v.length <= max ? v.trim() : null);
const NAME = /^[a-z0-9][a-z0-9._-]{0,120}\.(jpe?g|png|webp)$/i;
const photoFile = (v: unknown): string | undefined => (isPhoto(v) && NAME.test(v[PHOTO]) ? v[PHOTO] : undefined);
const isYmd = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);

/* ------------------------------------------------------------------ */
/* Actualités : apps/mobile/src/data/news.ts                            */
/* ------------------------------------------------------------------ */

/** Les types de l'app ramenés à ceux de l'admin ; un stage est une « nouvelle activité » (§8). */
const NEWS_KIND: Record<string, NewsKind> = { club: 'club', resultat: 'resultat', promo: 'promo', stage: 'activite', evenement: 'annonce' };

type AppNews = { id: string; kind: NewsKind; appKind: string; titre: string; accroche: string; date: string; club: NewsItem['club']; photo?: string; lien?: string; publique: boolean };

async function appNews(): Promise<{ path: string; items: AppNews[] }> {
  const file = mobilePath('src', 'data', 'news.ts');
  const raw = await evalArray(file, 'export const NEWS');
  const items: AppNews[] = [];
  for (const r of raw as Record<string, unknown>[]) {
    const id = str(r?.id, 80);
    const titre = str(r?.titre, 200);
    const appKind = str(r?.kind, 30) ?? '';
    if (!id || !titre || !isYmd(r?.date)) continue;
    const lien = str(r?.lien, 500);
    items.push({
      id,
      kind: NEWS_KIND[appKind] ?? 'annonce',
      appKind,
      titre,
      accroche: str(r?.accroche, 2000) ?? '',
      date: r.date as string,
      club: isClubId(r?.club) ? r.club : null,
      photo: photoFile(r?.photo),
      lien: lien && lien.startsWith('https://') ? lien : undefined,
      publique: r?.publique !== false,
    });
  }
  return { path: displayPath(file), items };
}

/* ------------------------------------------------------------------ */
/* Vidéos : apps/mobile/src/data/videos.ts                              */
/* ------------------------------------------------------------------ */

type AppVideo = Omit<VideoItem, 'id' | 'source' | 'poster' | 'status' | 'createdAt' | 'createdBy' | 'updatedAt' | 'updatedBy'> & { appId: string; photo?: string };

async function appVideos(): Promise<{ path: string; items: AppVideo[] }> {
  const file = mobilePath('src', 'data', 'videos.ts');
  const raw = await evalArray(file, 'export const VIDEOS');
  const items: AppVideo[] = [];
  for (const r of raw as Record<string, unknown>[]) {
    const appId = str(r?.id, 80);
    const title = str(r?.titre, 200);
    if (!appId || !title || !isFamilleVideo(r?.famille) || !isNiveau(r?.niveau) || !isObjectif(r?.objectif) || !isSecurite(r?.securite)) continue;
    const numero = Number(r?.numero);
    const duree = Number(r?.dureeMin);
    items.push({
      appId,
      numero: Number.isInteger(numero) && numero > 0 ? numero : 0,
      title,
      famille: r.famille,
      niveau: r.niveau,
      dureeMin: Number.isFinite(duree) && duree > 0 ? Math.round(duree) : 1,
      objectif: r.objectif,
      securite: r.securite,
      gratuite: r?.gratuite === true,
      coach: str(r?.coach, 60) ?? undefined,
      photo: photoFile(r?.photo),
    });
  }
  return { path: displayPath(file), items };
}

/** Combien d'articles la rubrique « Combats » (§13) tient de son flux : ils restent où ils sont. */
async function appCombatsCount(): Promise<number> {
  try {
    return (await evalArray(mobilePath('src', 'data', 'combats.ts'), 'export const COMBATS_INSTANTANE')).length;
  } catch {
    return 0;
  }
}

/* ------------------------------------------------------------------ */
/* Aperçu et reprise                                                    */
/* ------------------------------------------------------------------ */

const appId = (id: string) => `app-${id}`;

export async function previewImport(kind: 'news' | 'event' | 'video'): Promise<ImportPreview> {
  try {
    if (kind === 'news') {
      const [{ path: p, items }, have] = await Promise.all([appNews(), readNews()]);
      const ids = new Set(have.map((n) => n.id));
      return {
        kind,
        path: p,
        candidates: items.map((n) => ({ id: n.id, title: n.titre, sub: n.accroche, photo: n.photo, already: ids.has(appId(n.id)), target: `actu.kind.${n.kind}` })),
        notes: [{ key: 'contenu.import.note.news' }],
      };
    }
    if (kind === 'video') {
      const [{ path: p, items }, have] = await Promise.all([appVideos(), readVideos()]);
      const ids = new Set(have.map((v) => v.id));
      return {
        kind,
        path: p,
        candidates: items.map((v) => ({ id: v.appId, title: `${v.numero ? `${v.numero} · ` : ''}${v.title}`, sub: `${v.niveau} · ${v.dureeMin} min · ${v.objectif}`, photo: v.photo, already: ids.has(appId(v.appId)), target: 'contenu.import.target.videoDraft' })),
        notes: [{ key: 'contenu.import.note.video' }],
      };
    }
    // Événements : l'app n'en a pas à elle ; ses articles de combats sont un flux de presse (§13).
    const combats = await appCombatsCount();
    return { kind, path: 'apps/mobile/src/data/combats.ts', candidates: [], notes: [{ key: 'contenu.import.note.events', vars: { n: combats } }, { key: 'contenu.import.note.eventsStage' }] };
  } catch (err) {
    return { kind, path: kind === 'video' ? 'apps/mobile/src/data/videos.ts' : 'apps/mobile/src/data/news.ts', candidates: [], notes: [], error: err instanceof Error ? err.message : String(err) };
  }
}

/** Les actualités choisies, au format de l'admin, en ligne comme dans l'app aujourd'hui. */
export async function newsFromApp(ids: string[], by: string): Promise<NewsItem[]> {
  const { items } = await appNews();
  const stamp = new Date().toISOString();
  return items
    .filter((n) => ids.includes(n.id))
    .map((n) => ({
      id: appId(n.id),
      kind: n.kind,
      title: n.titre,
      body: n.accroche,
      photo: n.photo ? { kind: 'photo' as const, file: n.photo, alt: n.titre } : undefined,
      date: n.date,
      link: n.lien ? { url: n.lien, label: 'En savoir plus' } : undefined,
      club: n.club,
      audience: n.publique ? ('tous' as const) : ('actifs' as const),
      status: 'publie' as const,
      publishedAt: stamp,
      important: false,
      origin: 'app' as const,
      createdAt: stamp,
      createdBy: by,
      updatedAt: stamp,
      updatedBy: by,
    }));
}

/**
 * Les vidéos choisies. Leurs fichiers n'existent pas encore (l'hébergeur n'est
 * pas branché) : elles arrivent en brouillon, prêtes à recevoir leur fichier.
 */
export async function videosFromApp(ids: string[], by: string, taken: number[]): Promise<VideoItem[]> {
  const { items } = await appVideos();
  const stamp = new Date().toISOString();
  const used = new Set(taken);
  let next = Math.max(0, ...taken) + 1;
  return items
    .filter((v) => ids.includes(v.appId))
    .map((v) => {
      let numero = v.numero;
      if (!numero || used.has(numero)) numero = next++;
      used.add(numero);
      return {
        id: appId(v.appId),
        numero,
        title: v.title,
        famille: v.famille,
        niveau: v.niveau,
        dureeMin: v.dureeMin,
        objectif: v.objectif,
        securite: v.securite,
        gratuite: v.gratuite,
        coach: v.coach,
        source: { kind: 'stream' as const, ref: '' },
        poster: v.photo ? { kind: 'photo' as const, file: v.photo, alt: v.title } : undefined,
        status: 'brouillon' as const,
        origin: 'app' as const,
        createdAt: stamp,
        createdBy: by,
        updatedAt: stamp,
        updatedBy: by,
      };
    });
}
