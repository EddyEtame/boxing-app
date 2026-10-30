/**
 * Met a jour les .env locaux (gitignore) a partir de gestion-manager, BOXPLUS et le bridge.
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

const gestion = readEnvFile(path.join(root, '..', '..', 'gestion-manager', '.env.local'));
const gestionEnv = readEnvFile(path.join(root, '..', '..', 'gestion-manager', '.env'));
const boxplus = readEnvFile(path.join(root, '..', '..', 'BOXPLUS', '.env'));

const supabaseUrl =
  gestion.NEXT_PUBLIC_SUPABASE_URL ||
  gestion.SUPABASE_URL ||
  gestionEnv.NEXT_PUBLIC_SUPABASE_URL ||
  boxplus.SUPABASE_URL ||
  '';
const serviceRole =
  gestion.SUPABASE_SERVICE_ROLE_KEY ||
  gestionEnv.SUPABASE_SERVICE_ROLE_KEY ||
  boxplus.SUPABASE_SERVICE_ROLE_KEY ||
  '';
const anonKey =
  gestion.SUPABASE_ANON_KEY ||
  gestion.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  gestionEnv.SUPABASE_ANON_KEY ||
  'sb_publishable_cz1uCXuemMT0cKLFAY4jdw_pDr16tWO';

const brevoKey = gestion.BREVO_API_KEY || boxplus.BREVO_API_KEY || '';
const botSync = boxplus.SYNC_SECRET || devSecret('bot-sync');

const bridgePath = path.join(root, 'apps', 'bridge', '.env');
const existingBridge = readEnvFile(bridgePath);
const appBridgeSecret = existingBridge.APP_BRIDGE_SECRET || devSecret('app-bridge');
const adminBridgeSecret = existingBridge.ADMIN_BRIDGE_SECRET || devSecret('admin-bridge');
const shopBridgeSecret = existingBridge.SHOP_BRIDGE_SECRET || devSecret('shop-bridge');

const bridgeEnv = `# Genere par scripts/bootstrap-local-env.mjs — ne pas committer
PORT=8080
HOST=127.0.0.1
PUBLIC_URL=http://127.0.0.1:8080
SUPABASE_URL=${supabaseUrl}
SUPABASE_SERVICE_ROLE_KEY=${serviceRole}
BOT_URL=http://127.0.0.1:3050
BOT_SYNC_SECRET=${botSync}
APP_BRIDGE_SECRET=${appBridgeSecret}
ADMIN_BRIDGE_SECRET=${adminBridgeSecret}
SHOP_BRIDGE_SECRET=${shopBridgeSecret}
SEND_EMAIL_HOOK_SECRET=${existingBridge.SEND_EMAIL_HOOK_SECRET || `v1,whsec_${Buffer.from(devSecret('hook')).toString('base64')}`}
BREVO_API_KEY=${brevoKey}
BREVO_SENDER_EMAIL=${gestion.BREVO_SENDER_EMAIL || boxplus.BREVO_SENDER_EMAIL || 'suzinabot@gmail.com'}
BREVO_SENDER_NAME=${gestion.BREVO_SENDER_NAME || boxplus.BREVO_SENDER_NAME || 'Boxing Center'}
BREVO_REPLY_TO=${gestion.BREVO_REPLY_TO || boxplus.BREVO_REPLY_TO || 'boxingcenter31@gmail.com'}
BOUTIQUE_CHECKOUT_BASE_URL=http://127.0.0.1:3040/checkout/app
`;

const mobileEnv = `# Genere par scripts/bootstrap-local-env.mjs — ne pas committer
EXPO_PUBLIC_API_URL=http://127.0.0.1:3001
EXPO_PUBLIC_MEMBER_API_URL=http://127.0.0.1:8080
EXPO_PUBLIC_SUPABASE_URL=${supabaseUrl}
EXPO_PUBLIC_SUPABASE_ANON_KEY=${anonKey}
`;

fs.writeFileSync(bridgePath, bridgeEnv);
fs.writeFileSync(path.join(root, 'apps', 'mobile', '.env'), mobileEnv);

const boxplusPath = path.join(root, '..', '..', 'BOXPLUS', '.env');
if (fs.existsSync(boxplusPath)) {
  let bp = fs.readFileSync(boxplusPath, 'utf8');
  const lines = [
    ['APP_BRIDGE_PUBLIC_URL', 'http://127.0.0.1:8080'],
    ['APP_BRIDGE_SECRET', appBridgeSecret],
    ['SHOP_BRIDGE_SECRET', shopBridgeSecret],
  ];
  for (const [key, val] of lines) {
    const re = new RegExp(`^${key}=.*$`, 'm');
    if (re.test(bp)) bp = bp.replace(re, `${key}=${val}`);
    else bp += `\n${key}=${val}\n`;
  }
  fs.writeFileSync(boxplusPath, bp);
}

console.log('Env locaux mis a jour (bridge, mobile, cles APP/SHOP dans BOXPLUS/.env).');
if (!supabaseUrl || !serviceRole) console.log('Attention : Supabase incomplet — verifier gestion-manager/.env.local');
