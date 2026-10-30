import { createHash } from 'node:crypto';
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { backupDir, dataDir } from '../src/server/store';

/**
 * SAUVEGARDE DES DONNÉES DE L'ADMIN — `npm run backup --workspace apps/admin`.
 *
 * Copie tout le dossier des données (apps/admin/.data, ou ADMIN_DATA_DIR) dans
 * un dossier daté (apps/admin/.backups/AAAA-MM-JJ_HHMM, ou ADMIN_BACKUP_DIR),
 * avec un manifeste (taille et empreinte de chaque fichier), puis ne garde que
 * les 30 plus récentes. À lancer une fois par jour par la tâche planifiée de
 * l'hébergeur ; la page « Branchements » lit la date de la dernière.
 * Rien n'est affiché d'autre que des noms de fichiers et des tailles.
 */
const KEEP = Number(process.env.ADMIN_BACKUP_KEEP ?? 30);

function walk(dir: string, base = dir): { rel: string; size: number; sha256: string }[] {
  const out: { rel: string; size: number; sha256: string }[] = [];
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) out.push(...walk(full, base));
    else out.push({ rel: path.relative(base, full).split(path.sep).join('/'), size: st.size, sha256: createHash('sha256').update(readFileSync(full)).digest('hex') });
  }
  return out;
}

const source = dataDir();
if (!existsSync(source)) {
  console.error(`✗ Aucune donnée à sauvegarder : ${source} n’existe pas.`);
  process.exit(1);
}

const now = new Date();
const pad = (n: number) => String(n).padStart(2, '0');
const stamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}`;
const root = backupDir();
const target = path.join(root, stamp);
mkdirSync(root, { recursive: true });
if (existsSync(target)) rmSync(target, { recursive: true, force: true });
cpSync(source, target, { recursive: true });

const files = walk(target);
const bytes = files.reduce((n, f) => n + f.size, 0);
writeFileSync(path.join(target, 'manifest.json'), JSON.stringify({ at: now.toISOString(), source: path.basename(source), files }, null, 2));

const kept = readdirSync(root)
  .filter((n) => /^\d{4}-\d{2}-\d{2}_\d{4}$/.test(n))
  .sort();
const stale = kept.slice(0, Math.max(0, kept.length - KEEP));
for (const name of stale) rmSync(path.join(root, name), { recursive: true, force: true });

console.log(`✓ Sauvegarde ${stamp} : ${files.length} fichiers, ${(bytes / 1024).toFixed(0)} Ko → ${target}`);
if (stale.length) console.log(`✓ ${stale.length} ancienne${stale.length > 1 ? 's' : ''} retirée${stale.length > 1 ? 's' : ''} (on garde les ${KEEP} dernières)`);
