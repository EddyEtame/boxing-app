import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';

import { read, readFeatures } from './collections';
import { sha256 } from './crypto';
import { apiReads } from './demo';
import { configStatus } from './env';
import { mobilePath } from './paths';
import { sourceStatus } from './planning';
import { dataDir } from './store';
import { readEvents } from './usage';

/**
 * LES BRANCHEMENTS — tout ce à quoi l'admin est relié, mesuré au moment où on
 * regarde, jamais supposé. Chaque ligne dit : l'état (branché, en attente,
 * non branché, en erreur), les faits qui le prouvent, et ce qui manque — le
 * NOM de la variable à renseigner, jamais sa valeur.
 *
 * Demande d'Eddy (22/10/2026) : « le back-office est une application à part,
 * branchée à tout ». Cette page est la preuve de ce branchement.
 */
export type ConnState = 'ok' | 'attente' | 'off' | 'erreur';
export type ConnId = 'session' | 'app-mesure' | 'app-lecture' | 'planning-source' | 'planning-regle' | 'deciplus' | 'push' | 'video' | 'erreurs' | 'base' | 'sauvegardes' | 'boutique' | 'combats';

/** `as: 'key'` : la valeur est elle-même une clé du dictionnaire (« oui », « fichiers JSON locaux »…). */
export type Fact = { k: string; v: string | number; as?: 'date' | 'num' | 'bytes' | 'text' | 'ms' | 'key' };

export type Connection = {
  id: ConnId;
  state: ConnState;
  facts: Fact[];
  /** `optional` : son absence n'est pas un défaut (une origine en plus, un dossier de données ailleurs). */
  env?: { name: string; set: boolean; optional?: boolean }[];
  /** Un message d'erreur court (jamais un secret, jamais une pile). */
  error?: string;
  /** Lien vers la page de l'admin qui s'en sert. */
  href?: string;
};

export type ConnectionsReport = { checkedAt: string; items: Connection[] };

const has = (name: string) => Boolean(process.env[name]?.trim());
const env = (...names: string[]) => names.map((name) => ({ name, set: has(name) }));
const optionalEnv = (...names: string[]) => names.map((name) => ({ name, set: has(name), optional: true }));
const DAY = 86_400_000;

/** L'empreinte des deux fichiers de l'app dont l'admin a porté la règle de grille (22/10/2026). */
const PORTED = { 'grid.ts': 'ac6a3f35a8fcc78c', 'model.ts': 'fe69158231582c5b' } as const;

async function withTimeout<T>(ms: number, run: (signal: AbortSignal) => Promise<T>): Promise<T> {
  const ctl = new AbortController();
  const id = setTimeout(() => ctl.abort(), ms);
  try {
    return await run(ctl.signal);
  } finally {
    clearTimeout(id);
  }
}

function shortError(err: unknown): string {
  if (err instanceof Error) {
    if (err.name === 'AbortError') return 'timeout 4 s';
    return err.message.replace(/https?:\/\/\S+/g, '…').slice(0, 120);
  }
  return 'erreur inconnue';
}

async function dirSize(dir: string): Promise<{ bytes: number; files: number; lastWrite: number }> {
  let bytes = 0;
  let files = 0;
  let lastWrite = 0;
  let entries: string[] = [];
  try {
    entries = await readdir(dir);
  } catch {
    return { bytes, files, lastWrite };
  }
  for (const name of entries) {
    const p = path.join(dir, name);
    const s = await stat(p).catch(() => null);
    if (!s) continue;
    if (s.isDirectory()) {
      const sub = await dirSize(p);
      bytes += sub.bytes;
      files += sub.files;
      lastWrite = Math.max(lastWrite, sub.lastWrite);
    } else {
      bytes += s.size;
      files += 1;
      lastWrite = Math.max(lastWrite, s.mtimeMs);
    }
  }
  return { bytes, files, lastWrite };
}

async function checkSession(): Promise<Connection> {
  const c = configStatus();
  return {
    id: 'session',
    state: c.direction && c.secret ? 'ok' : 'erreur',
    facts: [
      { k: 'sys.fact.directionAccount', v: c.direction ? 'sys.val.yes' : 'sys.val.no', as: 'key' },
      { k: 'sys.fact.sessionSecret', v: c.secret ? 'sys.val.yes' : 'sys.val.no', as: 'key' },
    ],
    env: env('SUPER_ADMIN_EMAIL', 'SUPER_ADMIN_PASSWORD', 'SESSION_SECRET'),
  };
}

async function checkMesure(now: number): Promise<Connection> {
  const [rows, features] = await Promise.all([readEvents(), readFeatures()]);
  let last: string | null = null;
  let day = 0;
  let demo = 0;
  for (const r of rows) {
    if (r.s === 'demo') {
      demo++;
      continue;
    }
    if (!last || r.e.at > last) last = r.e.at;
    if (now - Date.parse(r.r ?? r.e.at) < DAY) day++;
  }
  const on = features.mesure.on;
  const state: ConnState = !on ? 'off' : last && now - Date.parse(last) < DAY ? 'ok' : 'attente';
  const facts: Fact[] = [
    { k: 'sys.fact.lastAppEvent', v: last ?? '—', as: last ? 'date' : 'text' },
    { k: 'sys.fact.events24h', v: day, as: 'num' },
    { k: 'sys.fact.demoEvents', v: demo, as: 'num' },
  ];
  return { id: 'app-mesure', state, facts, href: '/statistiques' };
}

async function checkLectures(): Promise<Connection> {
  const { since, byKind } = apiReads();
  const kinds = Object.entries(byKind);
  const fromApp = kinds.filter(([, r]) => r.lastOrigin === 'app' || (r.lastOrigin && /localhost:8081|exp:\/\/|192\.168\.|10\.\d+/.test(r.lastOrigin)));
  const total = kinds.reduce((n, [, r]) => n + r.count, 0);
  const last = kinds.map(([, r]) => r.lastAt).filter(Boolean).sort().pop() ?? null;
  return {
    id: 'app-lecture',
    state: fromApp.length ? 'ok' : total ? 'attente' : 'attente',
    facts: [
      { k: 'sys.fact.readsSince', v: since, as: 'date' },
      { k: 'sys.fact.reads', v: total, as: 'num' },
      { k: 'sys.fact.lastRead', v: last ?? '—', as: last ? 'date' : 'text' },
      { k: 'sys.fact.readKinds', v: kinds.map(([k, r]) => `${k} ${r.count}`).join(' · ') || '—', as: 'text' },
    ],
    env: optionalEnv('ADMIN_CORS_ORIGINS'),
    href: '/statistiques/demo',
  };
}

async function checkPlanningSource(): Promise<Connection> {
  const st = await sourceStatus();
  if (st.kind === 'illisible') return { id: 'planning-source', state: 'erreur', facts: [{ k: 'sys.fact.file', v: st.path, as: 'text' }], error: st.error.slice(0, 160), href: '/plannings' };
  if (st.kind === 'identique') {
    return {
      id: 'planning-source',
      state: 'ok',
      facts: [
        { k: 'sys.fact.file', v: st.path, as: 'text' },
        { k: 'sys.fact.importedAt', v: st.importedAt, as: 'date' },
        { k: 'sys.fact.slots', v: st.count, as: 'num' },
        { k: 'sys.fact.localChanges', v: st.local.added.length + st.local.removed.length + st.local.changed.length, as: 'num' },
      ],
      href: '/plannings',
    };
  }
  return {
    id: 'planning-source',
    state: 'attente',
    facts: [
      { k: 'sys.fact.file', v: st.path, as: 'text' },
      { k: 'sys.fact.importedAt', v: st.importedAt, as: 'date' },
      { k: 'sys.fact.appChanges', v: st.app.added.length + st.app.removed.length + st.app.changed.length, as: 'num' },
      { k: 'sys.fact.conflicts', v: st.conflicts.length, as: 'num' },
    ],
    href: '/plannings',
  };
}

async function checkPlanningRule(): Promise<Connection> {
  const facts: Fact[] = [];
  let drift = 0;
  for (const [file, expected] of Object.entries(PORTED)) {
    const p = mobilePath('src', 'features', 'planning', file);
    const text = await readFile(p, 'utf8').catch(() => null);
    const hash = text === null ? null : sha256(text).slice(0, 16);
    if (hash !== expected) drift++;
    facts.push({ k: 'sys.fact.ruleFile', v: `${file} · ${hash ?? 'absent'}${hash === expected ? '' : ` (≠ ${expected})`}`, as: 'text' });
  }
  return { id: 'planning-regle', state: drift ? 'attente' : 'ok', facts, href: '/plannings' };
}

export async function checkDeciplus(): Promise<Connection> {
  const vars = env('DECIPLUS_BRIDGE_URL', 'DECIPLUS_BRIDGE_SECRET');
  if (!vars.every((v) => v.set)) return { id: 'deciplus', state: 'off', facts: [{ k: 'sys.fact.mode', v: 'sys.val.localDemo', as: 'key' }], env: vars, href: '/deciplus' };
  const url = process.env.DECIPLUS_BRIDGE_URL!.replace(/\/+$/, '');
  const t0 = Date.now();
  try {
    const res = await withTimeout(4000, (signal) => fetch(`${url}/health`, { headers: { authorization: `Bearer ${process.env.DECIPLUS_BRIDGE_SECRET}` }, signal, cache: 'no-store' }));
    const ms = Date.now() - t0;
    return { id: 'deciplus', state: res.ok ? 'ok' : 'erreur', facts: [{ k: 'sys.fact.http', v: res.status, as: 'num' }, { k: 'sys.fact.latency', v: ms, as: 'ms' }], env: vars, error: res.ok ? undefined : `HTTP ${res.status}`, href: '/deciplus' };
  } catch (err) {
    return { id: 'deciplus', state: 'erreur', facts: [{ k: 'sys.fact.latency', v: Date.now() - t0, as: 'ms' }], env: vars, error: shortError(err), href: '/deciplus' };
  }
}

async function checkPush(): Promise<Connection> {
  const [notifications, envois] = await Promise.all([read('notifications'), read('envois')]);
  const queued = notifications.filter((n) => n.status === 'en-file').length + envois.filter((e) => e.status === 'en-file').length;
  const vars = env('EXPO_ACCESS_TOKEN');
  return {
    id: 'push',
    state: vars[0].set ? 'attente' : 'off',
    facts: [{ k: 'sys.fact.queued', v: queued, as: 'num' }],
    env: vars,
    href: '/notifications',
  };
}

async function checkVideo(): Promise<Connection> {
  const vars = env('CLOUDFLARE_STREAM_ACCOUNT_ID', 'CLOUDFLARE_STREAM_TOKEN');
  const videos = await read('videos');
  return { id: 'video', state: vars.every((v) => v.set) ? 'attente' : 'off', facts: [{ k: 'sys.fact.videos', v: videos.length, as: 'num' }], env: vars, href: '/videos' };
}

async function checkErreurs(): Promise<Connection> {
  const vars = env('SENTRY_DSN');
  return { id: 'erreurs', state: vars[0].set ? 'attente' : 'off', facts: [{ k: 'sys.fact.errorsNow', v: 'sys.val.serverLog', as: 'key' }], env: vars };
}

async function checkBase(): Promise<Connection> {
  const dir = dataDir();
  const size = await dirSize(dir);
  const vars = optionalEnv('SUPABASE_URL', 'ADMIN_DATA_DIR');
  return {
    id: 'base',
    state: vars[0].set ? 'attente' : 'ok',
    facts: [
      { k: 'sys.fact.storage', v: vars[0].set ? 'sys.val.supabase' : 'sys.val.jsonFiles', as: 'key' },
      { k: 'sys.fact.files', v: size.files, as: 'num' },
      { k: 'sys.fact.size', v: size.bytes, as: 'bytes' },
      { k: 'sys.fact.lastWrite', v: size.lastWrite ? new Date(size.lastWrite).toISOString() : '—', as: size.lastWrite ? 'date' : 'text' },
    ],
    env: vars,
  };
}

async function checkSauvegardes(): Promise<Connection> {
  return { id: 'sauvegardes', state: 'off', facts: [{ k: 'sys.fact.lastBackup', v: '—', as: 'text' }] };
}

async function checkBoutique(): Promise<Connection> {
  const vars = env('BOUTIQUE_URL');
  if (!vars[0].set) return { id: 'boutique', state: 'off', facts: [], env: vars };
  const url = process.env.BOUTIQUE_URL!;
  const t0 = Date.now();
  try {
    const res = await withTimeout(4000, (signal) => fetch(url, { method: 'HEAD', signal, cache: 'no-store', redirect: 'follow' }));
    return { id: 'boutique', state: res.ok ? 'ok' : 'erreur', facts: [{ k: 'sys.fact.http', v: res.status, as: 'num' }, { k: 'sys.fact.latency', v: Date.now() - t0, as: 'ms' }], env: vars, error: res.ok ? undefined : `HTTP ${res.status}` };
  } catch (err) {
    return { id: 'boutique', state: 'erreur', facts: [], env: vars, error: shortError(err) };
  }
}

async function checkCombats(): Promise<Connection> {
  const events = await read('evenements');
  const published = events.filter((e) => e.status === 'publie' && (e.kind === 'combat' || e.kind === 'gala' || e.kind === 'stage' || e.kind === 'competition')).length;
  return { id: 'combats', state: 'ok', facts: [{ k: 'sys.fact.videos', v: published, as: 'num' }] };
}

/** Toutes les vérifications, en parallèle ; une vérification qui casse devient une ligne « en erreur », jamais une page blanche. */
export async function checkConnections(now = Date.now()): Promise<ConnectionsReport> {
  const runs: [ConnId, () => Promise<Connection>][] = [
    ['session', checkSession],
    ['app-mesure', () => checkMesure(now)],
    ['app-lecture', checkLectures],
    ['planning-source', checkPlanningSource],
    ['planning-regle', checkPlanningRule],
    ['deciplus', checkDeciplus],
    ['push', checkPush],
    ['video', checkVideo],
    ['erreurs', checkErreurs],
    ['base', checkBase],
    ['sauvegardes', checkSauvegardes],
    ['boutique', checkBoutique],
    ['combats', checkCombats],
  ];
  const items = await Promise.all(
    runs.map(async ([id, run]) => {
      try {
        return await run();
      } catch (err) {
        return { id, state: 'erreur', facts: [], error: shortError(err) } satisfies Connection;
      }
    }),
  );
  return { checkedAt: new Date(now).toISOString(), items };
}
