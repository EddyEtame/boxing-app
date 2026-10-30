/**
 * Prepare .env.server (gitignore) pour BotHosting a partir des .env locaux.
 * N'affiche jamais les valeurs. Les jetons encore inconnus restent vides.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const boxplusRoot = path.join(root, '..', 'BOXPLUS');

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

function upsert(filePath, pairs) {
  let text = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : '';
  for (const [key, val] of pairs) {
    if (!val) continue;
    const re = new RegExp(`^${key}=.*$`, 'm');
    if (re.test(text)) {
      const current = text.match(re)?.[0] ?? '';
      if (current === `${key}=`) text = text.replace(re, `${key}=${val}`);
    } else text += `\n${key}=${val}\n`;
  }
  fs.writeFileSync(filePath, text.endsWith('\n') ? text : `${text}\n`);
}

const gestion = readEnvFile(path.join(root, '..', 'gestion-manager', '.env.local'));
const boxplus = readEnvFile(path.join(boxplusRoot, '.env'));
const bridge = readEnvFile(path.join(root, 'apps', 'bridge', '.env'));

const supabaseUrl = bridge.SUPABASE_URL || gestion.NEXT_PUBLIC_SUPABASE_URL || gestion.SUPABASE_URL || boxplus.SUPABASE_URL || '';
const serviceRole = bridge.SUPABASE_SERVICE_ROLE_KEY || gestion.SUPABASE_SERVICE_ROLE_KEY || boxplus.SUPABASE_SERVICE_ROLE_KEY || '';
const anon = gestion.NEXT_PUBLIC_SUPABASE_ANON_KEY || gestion.SUPABASE_ANON_KEY || boxplus.SUPABASE_ANON_KEY || '';

const lines = [
  '# Genere par scripts/bootstrap-server.mjs — ne pas committer.',
  '# A copier sur le serveur BotHosting comme .env.server, a cote de bootstrap.js.',
  '# Jeton tunnel : https://one.dash.cloudflare.com/ -> Zero Trust -> Networks -> Tunnels',
  'PORT=8080',
  'HOST=0.0.0.0',
  'PUBLIC_URL=https://api.boxingcenter.fr',
  `SUPABASE_URL=${supabaseUrl}`,
  `SUPABASE_SERVICE_ROLE_KEY=${serviceRole}`,
  'BOT_URL=http://127.0.0.1:3050',
  `BOT_SYNC_SECRET=${bridge.BOT_SYNC_SECRET || boxplus.SYNC_SECRET || ''}`,
  `APP_BRIDGE_SECRET=${bridge.APP_BRIDGE_SECRET || ''}`,
  `ADMIN_BRIDGE_SECRET=${bridge.ADMIN_BRIDGE_SECRET || ''}`,
  `SHOP_BRIDGE_SECRET=${bridge.SHOP_BRIDGE_SECRET || ''}`,
  `SEND_EMAIL_HOOK_SECRET=${bridge.SEND_EMAIL_HOOK_SECRET || ''}`,
  `BREVO_API_KEY=${bridge.BREVO_API_KEY || gestion.BREVO_API_KEY || boxplus.BREVO_API_KEY || ''}`,
  `BREVO_SENDER_EMAIL=${bridge.BREVO_SENDER_EMAIL || 'suzinabot@gmail.com'}`,
  `BREVO_SENDER_NAME=${bridge.BREVO_SENDER_NAME || 'Boxing Center'}`,
  `BREVO_REPLY_TO=${bridge.BREVO_REPLY_TO || 'boxingcenter31@gmail.com'}`,
  'BOUTIQUE_CHECKOUT_BASE_URL=https://boutique.boxingcenter.fr/checkout/app',
  'ADMIN_INTERNAL_URL=http://127.0.0.1:3001',
  `ADMIN_APP_DIR=${path.join(root, 'apps', 'admin')}`,
  'ADMIN_PORT=3001',
  `ROBOT_DIR=${fs.existsSync(path.join(boxplusRoot, 'bot', 'index.js')) ? boxplusRoot : ''}`,
  `CLOUDFLARE_TUNNEL_TOKEN=${bridge.CLOUDFLARE_TUNNEL_TOKEN || ''}`,
  `SUPER_ADMIN_EMAIL=${gestion.SUPER_ADMIN_EMAIL || boxplus.SUPER_ADMIN_EMAIL || ''}`,
  `SESSION_SECRET=${''}`,
];

const adminLocal = readEnvFile(path.join(root, 'apps', 'admin', '.env.local'));
if (adminLocal.SESSION_SECRET) {
  const idx = lines.findIndex((l) => l.startsWith('SESSION_SECRET='));
  lines[idx] = `SESSION_SECRET=${adminLocal.SESSION_SECRET}`;
}
if (adminLocal.SUPER_ADMIN_EMAIL) {
  const idx = lines.findIndex((l) => l.startsWith('SUPER_ADMIN_EMAIL='));
  lines[idx] = `SUPER_ADMIN_EMAIL=${adminLocal.SUPER_ADMIN_EMAIL}`;
}
lines.push(`SUPER_ADMIN_PASSWORD=${adminLocal.SUPER_ADMIN_PASSWORD || ''}`);

const serverPath = path.join(root, 'apps', 'bridge', '.env.server');
fs.writeFileSync(serverPath, lines.join('\n') + '\n');

upsert(path.join(root, 'apps', 'admin', '.env.local'), [
  ['SUPABASE_URL', supabaseUrl],
  ['NEXT_PUBLIC_SUPABASE_URL', supabaseUrl],
  ['SUPABASE_SERVICE_ROLE_KEY', serviceRole],
  ['NEXT_PUBLIC_SUPABASE_ANON_KEY', anon],
]);

upsert(path.join(root, 'apps', 'mobile', '.env'), [
  ['EXPO_PUBLIC_SUPABASE_URL', supabaseUrl],
  ['EXPO_PUBLIC_SUPABASE_ANON_KEY', anon],
]);

const mobileProd = [
  '# Build de production : une seule origine publique (bridge + contenus admin relays).',
  'EXPO_PUBLIC_API_URL=https://api.boxingcenter.fr',
  'EXPO_PUBLIC_MEMBER_API_URL=https://api.boxingcenter.fr',
  `EXPO_PUBLIC_SUPABASE_URL=${supabaseUrl}`,
  `EXPO_PUBLIC_SUPABASE_ANON_KEY=${anon}`,
  '',
].join('\n');
fs.writeFileSync(path.join(root, 'apps', 'mobile', '.env.production'), mobileProd);

function force(filePath, pairs) {
  if (!fs.existsSync(filePath)) return;
  let text = fs.readFileSync(filePath, 'utf8');
  for (const [key, val] of pairs) {
    if (!val) continue;
    const re = new RegExp(`^${key}=.*$`, 'm');
    if (re.test(text)) text = text.replace(re, `${key}=${val}`);
    else text += `\n${key}=${val}\n`;
  }
  fs.writeFileSync(filePath, text.endsWith('\n') ? text : `${text}\n`);
}

if (fs.existsSync(path.join(boxplusRoot, '.env'))) {
  force(path.join(boxplusRoot, '.env'), [
    ['APP_BRIDGE_SECRET', bridge.APP_BRIDGE_SECRET || ''],
    ['SHOP_BRIDGE_SECRET', bridge.SHOP_BRIDGE_SECRET || ''],
  ]);
}

const empty = lines.filter((l) => l.includes('=') && !l.startsWith('#') && l.endsWith('=')).map((l) => l.slice(0, l.indexOf('=')));
console.log('Ecrit apps/bridge/.env.server, apps/mobile/.env.production, cles Supabase admin/mobile si elles manquaient.');
console.log(empty.length ? `Encore vides : ${empty.join(', ')}` : 'Aucune cle vide dans .env.server.');
