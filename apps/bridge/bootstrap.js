/**
 * Point d'entree BotHosting : charge .env.server puis lance start.mjs
 * (robot, tunnel Cloudflare, admin, bridge).
 *
 * Commande de demarrage : node bootstrap.js
 */
import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const file = join(root, '.env.server');

if (existsSync(file)) {
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
    const cut = trimmed.indexOf('=');
    const key = trimmed.slice(0, cut).trim();
    const value = trimmed.slice(cut + 1).trim();
    if (key && process.env[key] == null) process.env[key] = value;
  }
}

const child = spawn(process.execPath, ['start.mjs'], { cwd: root, env: process.env, stdio: 'inherit' });
child.on('exit', (code) => process.exit(code ?? 0));
process.on('SIGINT', () => child.kill('SIGINT'));
process.on('SIGTERM', () => child.kill('SIGTERM'));
