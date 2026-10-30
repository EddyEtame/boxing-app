/**
 * Cree apps/bridge/.env et apps/mobile/.env pour le dev local (gitignore).
 * Reutilise Supabase depuis gestion-manager/.env.local si present.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

function readEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const out = {};
  for (const line of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i < 1) continue;
    out[t.slice(0, i).trim()] = t.slice(i + 1).trim();
  }
  return out;
}

function devSecret(label) {
  return crypto.createHash('sha256').update(`${label}:local-dev`).digest('hex').slice(0, 32);
}

const gestion = readEnvFile(path.join(root, '..', 'gestion-manager', '.env.local'));
const supabaseUrl =
  gestion.NEXT_PUBLIC_SUPABASE_URL ||
  gestion.SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  '';
const serviceRole = gestion.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const anonKey =
  gestion.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  gestion.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  '';

const bridgeEnv = `# Genere par scripts/bootstrap-local-env.mjs — ne pas committer
PORT=8080
HOST=127.0.0.1
PUBLIC_URL=http://127.0.0.1:8080
SUPABASE_URL=${supabaseUrl}
SUPABASE_SERVICE_ROLE_KEY=${serviceRole}
BOT_URL=http://127.0.0.1:3050
BOT_SYNC_SECRET=${devSecret('bot-sync')}
APP_BRIDGE_SECRET=${devSecret('app-bridge')}
ADMIN_BRIDGE_SECRET=${devSecret('admin-bridge')}
SHOP_BRIDGE_SECRET=${devSecret('shop-bridge')}
SEND_EMAIL_HOOK_SECRET=v1,whsec_${Buffer.from(devSecret('hook')).slice(0, 24)}
BREVO_API_KEY=
BOUTIQUE_CHECKOUT_BASE_URL=http://127.0.0.1:3040/checkout/app
`;

const mobileEnv = `# Genere par scripts/bootstrap-local-env.mjs — ne pas committer
EXPO_PUBLIC_API_URL=http://127.0.0.1:3000
EXPO_PUBLIC_MEMBER_API_URL=http://127.0.0.1:8080
EXPO_PUBLIC_SUPABASE_URL=${supabaseUrl}
EXPO_PUBLIC_SUPABASE_ANON_KEY=${anonKey}
`;

const bridgePath = path.join(root, 'apps', 'bridge', '.env');
const mobilePath = path.join(root, 'apps', 'mobile', '.env');

if (!fs.existsSync(bridgePath)) {
  fs.writeFileSync(bridgePath, bridgeEnv);
  console.log('created', bridgePath);
} else {
  console.log('skip (exists)', bridgePath);
}

if (!fs.existsSync(mobilePath)) {
  fs.writeFileSync(mobilePath, mobileEnv);
  console.log('created', mobilePath);
} else {
  console.log('skip (exists)', mobilePath);
}

if (!supabaseUrl) {
  console.log('Astuce : renseigner Supabase dans gestion-manager/.env.local puis relancer ce script apres suppression des .env locaux, ou editer a la main.');
}
