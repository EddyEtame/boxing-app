import { promises as fs } from 'node:fs';
import path from 'node:path';

import { bumpLive } from './live-bump';

/**
 * Le stockage local de l'admin : un fichier JSON par collection, dans un
 * dossier gitignoré (apps/admin/.data par défaut). C'est la version « avant
 * Supabase » de l'architecture (livrable 2, §3) : mêmes collections, mêmes
 * formes, un seul module à remplacer le jour où la base existe.
 *
 * Deux garanties :
 *  - écriture atomique : on écrit un fichier temporaire, puis on le renomme ;
 *    une coupure ne laisse jamais un JSON à moitié écrit ;
 *  - une file par collection : deux écritures simultanées ne s'écrasent pas.
 *    La file vit sur globalThis, parce que Next charge parfois deux copies d'un
 *    module (rendu, actions, routes) dans le même processus.
 */
const g = globalThis as typeof globalThis & { __bcaQueues?: Map<string, Promise<unknown>> };
const queues = (g.__bcaQueues ??= new Map());

export function dataDir(): string {
  const custom = process.env.ADMIN_DATA_DIR?.trim();
  return custom ? path.resolve(custom) : path.join(process.cwd(), '.data');
}

export function dataPath(...parts: string[]): string {
  return path.join(dataDir(), ...parts);
}

/** Les sauvegardes datées des données (scripts/backup.ts) : apps/admin/.backups, ou ADMIN_BACKUP_DIR. */
export function backupDir(): string {
  const custom = process.env.ADMIN_BACKUP_DIR?.trim();
  return custom ? path.resolve(custom) : path.join(process.cwd(), '.backups');
}

/** Exécute `fn` après toutes les opérations déjà en file sur `key`. */
export function serialize<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const previous = queues.get(key) ?? Promise.resolve();
  const run = previous.then(fn, fn);
  queues.set(
    key,
    run.then(
      () => undefined,
      () => undefined,
    ),
  );
  return run;
}

async function readFileIfExists(file: string): Promise<string | null> {
  try {
    return await fs.readFile(file, 'utf8');
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw err;
  }
}

async function renameWithRetry(from: string, to: string): Promise<void> {
  // Sous Windows, un antivirus ou un éditeur peut tenir le fichier une fraction de seconde.
  for (let attempt = 0; ; attempt++) {
    try {
      await fs.rename(from, to);
      return;
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code;
      if (attempt >= 5 || (code !== 'EPERM' && code !== 'EBUSY' && code !== 'EACCES')) throw err;
      await new Promise((r) => setTimeout(r, 40 * (attempt + 1)));
    }
  }
}

export async function writeJsonFile(file: string, value: unknown): Promise<void> {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(value, null, 2) + '\n', 'utf8');
  await renameWithRetry(tmp, file);
}

/**
 * Lit une collection. Absente : `fallback()` est écrit puis renvoyé, pour que
 * l'état soit stable d'une lecture à l'autre. Illisible : on ne l'écrase
 * jamais ; on la met de côté (`.illisible-<date>`) et on repart du défaut,
 * en le disant dans le journal du serveur.
 */
export async function readCollection<T>(name: string, fallback: () => T): Promise<T> {
  const file = dataPath(`${name}.json`);
  const raw = await readFileIfExists(file);
  if (raw !== null) {
    try {
      return JSON.parse(raw) as T;
    } catch {
      return serialize(name, async () => {
        const again = await readFileIfExists(file);
        if (again !== null) {
          try {
            return JSON.parse(again) as T;
          } catch {
            const aside = `${file}.illisible-${new Date().toISOString().replace(/[:.]/g, '-')}`;
            await fs.rename(file, aside).catch(() => undefined);
            console.error(`[admin] ${name}.json illisible, mis de côté : ${path.basename(aside)}`);
          }
        }
        const initial = fallback();
        await writeJsonFile(file, initial);
        return initial;
      });
    }
  }
  return serialize(name, async () => {
    const again = await readFileIfExists(file);
    if (again !== null) return JSON.parse(again) as T;
    const initial = fallback();
    await writeJsonFile(file, initial);
    return initial;
  });
}

/** Lit, transforme et réécrit une collection, sans qu'une autre écriture s'intercale. */
export async function updateCollection<T, R = T>(name: string, fallback: () => T, mutate: (current: T) => { next: T; result: R } | Promise<{ next: T; result: R }>): Promise<R> {
  const file = dataPath(`${name}.json`);
  return serialize(name, async () => {
    const raw = await readFileIfExists(file);
    let current: T;
    try {
      current = raw === null ? fallback() : (JSON.parse(raw) as T);
    } catch {
      throw new Error(`${name}.json est illisible : rien n'a été écrit.`);
    }
    const { next, result } = await mutate(current);
    await writeJsonFile(file, next);
    void bumpLive(name, 'updated');
    return result;
  });
}

/** Ajoute des lignes à un fichier JSON lines (événements d'usage). */
export async function appendLines(name: string, lines: string[]): Promise<void> {
  if (!lines.length) return;
  const file = dataPath(name);
  await serialize(name, async () => {
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.appendFile(file, lines.join('\n') + '\n', 'utf8');
    void bumpLive('usage', 'append', { lines: lines.length });
  });
}

export async function fileStat(name: string): Promise<{ size: number; mtimeMs: number } | null> {
  try {
    const s = await fs.stat(dataPath(name));
    return { size: s.size, mtimeMs: s.mtimeMs };
  } catch {
    return null;
  }
}

export async function readText(name: string): Promise<string | null> {
  return readFileIfExists(dataPath(name));
}

export async function replaceText(name: string, content: string): Promise<void> {
  const file = dataPath(name);
  await serialize(name, async () => {
    await fs.mkdir(path.dirname(file), { recursive: true });
    const tmp = `${file}.${process.pid}.${Date.now().toString(36)}.tmp`;
    await fs.writeFile(tmp, content, 'utf8');
    await renameWithRetry(tmp, file);
  });
}
