/**
 * Prépare apps/admin/.env.local à partir de la boutique, sans jamais afficher
 * une valeur :
 *  - copie SUPER_ADMIN_EMAIL et SUPER_ADMIN_PASSWORD de box-plus/.env, et rien d'autre ;
 *  - génère SESSION_SECRET (64 caractères hexadécimaux) s'il n'existe pas encore ;
 *  - garde intactes les autres lignes de .env.local ;
 *  - relit le fichier avec le chargeur de Next et vérifie que les valeurs sont
 *    identiques à la source (un `$` ou un `#` dans un mot de passe ne doit rien casser) ;
 *  - vérifie que Git ignore bien le fichier.
 *
 * Usage (PowerShell, depuis la racine du dépôt) :
 *   npm run env:boutique --workspace apps/admin
 *   npm run env:boutique --workspace apps/admin -- --from "C:\chemin\vers\box-plus\.env"
 */
import { execFileSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const KEYS = ['SUPER_ADMIN_EMAIL', 'SUPER_ADMIN_PASSWORD'] as const;

const adminDir = path.resolve(__dirname, '..');
const repoRoot = path.resolve(adminDir, '..', '..');
const target = path.join(adminDir, '.env.local');

function argValue(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

const source = path.resolve(argValue('--from') ?? process.env.BOUTIQUE_ENV ?? path.join(repoRoot, '..', '..', '..', 'Plannings', 'box-plus', '.env'));

function fail(message: string): never {
  console.error(`\n✗ ${message}\n`);
  process.exit(1);
}

/** La lecture de dotenv 16 (celle de la boutique), ligne à ligne. */
const LINE = /(?:^|^)\s*(?:export\s+)?([\w.-]+)(?:\s*=\s*?|:\s+?)(\s*'(?:\\'|[^'])*'|\s*"(?:\\"|[^"])*"|\s*`(?:\\`|[^`])*`|[^#\r\n]+)?\s*(?:#.*)?(?:$|$)/gm;

function parseDotenv(src: string): Record<string, string> {
  const out: Record<string, string> = {};
  const lines = src.replace(/\r\n?/gm, '\n');
  let match: RegExpExecArray | null;
  LINE.lastIndex = 0;
  while ((match = LINE.exec(lines)) !== null) {
    const key = match[1]!;
    let value = (match[2] ?? '').trim();
    const quote = value[0];
    value = value.replace(/^(['"`])([\s\S]*)\1$/gm, '$2');
    if (quote === '"') value = value.replace(/\\n/g, '\n').replace(/\\r/g, '\r');
    out[key] = value;
  }
  return out;
}

/** Une ligne que dotenv relit à l'identique et que Next n'interpole pas (`$` échappé). */
function serialize(key: string, value: string): string {
  if (/[\r\n]/.test(value)) fail(`${key} contient un retour à la ligne : impossible à écrire proprement dans un fichier .env.`);
  const escaped = value.replace(/\$/g, '\\$');
  const needsQuotes = /[#'"`\s]/.test(value) || value !== value.trim();
  if (!needsQuotes) return `${key}=${escaped}`;
  const quote = ["'", '`', '"'].find((q) => !value.includes(q));
  if (!quote) fail(`${key} contient les trois sortes de guillemets : à copier à la main.`);
  return `${key}=${quote}${escaped}${quote}`;
}

if (!existsSync(source)) fail(`Fichier de la boutique introuvable : ${source}\n  Indiquez-le avec --from "C:\\chemin\\vers\\box-plus\\.env".`);

const shop = parseDotenv(readFileSync(source, 'utf8'));
for (const key of KEYS) if (!shop[key]) fail(`${key} est absent ou vide dans ${path.basename(path.dirname(source))}/.env.`);

const existing = existsSync(target) ? readFileSync(target, 'utf8').replace(/\r\n?/g, '\n') : '';
const current = parseDotenv(existing);
const keepSecret = Boolean(current.SESSION_SECRET && current.SESSION_SECRET.length >= 32);
const secret = keepSecret ? current.SESSION_SECRET! : randomBytes(32).toString('hex');

const managed = new Set<string>([...KEYS, 'SESSION_SECRET']);
const kept = existing
  .split('\n')
  .filter((line) => {
    const m = /^\s*(?:export\s+)?([\w.-]+)\s*=/.exec(line);
    return !(m && managed.has(m[1]!));
  })
  .join('\n')
  .replace(/\n{3,}/g, '\n\n')
  .trim();

const header = '# Écrit par « npm run env:boutique --workspace apps/admin ». Ne jamais versionner ce fichier.';
const body = [
  kept.startsWith('# Écrit par') ? '' : header,
  kept,
  '',
  '# Le compte Direction : les identifiants du super administrateur de la boutique.',
  serialize('SUPER_ADMIN_EMAIL', shop.SUPER_ADMIN_EMAIL!),
  serialize('SUPER_ADMIN_PASSWORD', shop.SUPER_ADMIN_PASSWORD!),
  '# Signature des cookies de session de l’admin.',
  serialize('SESSION_SECRET', secret),
  '',
]
  .filter((line, i, all) => !(line === '' && all[i - 1] === ''))
  .join('\n')
  .replace(/^\n+/, '');

writeFileSync(target, body, { encoding: 'utf8', mode: 0o600 });

// Relecture par le chargeur de Next : ce que l'admin verra vraiment au démarrage.
async function verify(): Promise<boolean | null> {
  try {
    const { loadEnvConfig } = await import('@next/env');
    for (const key of managed) delete process.env[key];
    loadEnvConfig(adminDir, true, { info: () => {}, error: () => {} }, true);
    return process.env.SUPER_ADMIN_EMAIL === shop.SUPER_ADMIN_EMAIL && process.env.SUPER_ADMIN_PASSWORD === shop.SUPER_ADMIN_PASSWORD && process.env.SESSION_SECRET === secret;
  } catch {
    return null;
  }
}

function ignoredByGit(): boolean | null {
  try {
    execFileSync('git', ['check-ignore', '-q', target], { cwd: repoRoot, stdio: 'ignore' });
    return true;
  } catch (err) {
    const status = (err as { status?: number }).status;
    return status === 1 ? false : null;
  }
}

void (async () => {
  const same = await verify();
  const ignored = ignoredByGit();
  const rel = path.relative(repoRoot, target).split(path.sep).join('/');
  console.log('');
  console.log(`✓ SUPER_ADMIN_EMAIL copié depuis la boutique`);
  console.log(`✓ SUPER_ADMIN_PASSWORD copié depuis la boutique`);
  console.log(keepSecret ? '✓ SESSION_SECRET conservé (déjà présent)' : '✓ SESSION_SECRET généré (64 caractères hexadécimaux)');
  if (same === true) console.log('✓ Relu avec le chargeur de Next : valeurs identiques à la source');
  else if (same === false) fail('La relecture par Next ne donne pas les mêmes valeurs : vérifiez les caractères spéciaux du mot de passe.');
  else console.log('• Relecture par Next impossible ici (paquet @next/env introuvable) : vérifiez la connexion au démarrage.');
  if (ignored === true) console.log(`✓ ${rel} est ignoré par Git`);
  else if (ignored === false) fail(`${rel} n'est PAS ignoré par Git : ne le commitez pas, et corrigez .gitignore.`);
  console.log(`\nFichier écrit : ${rel}. Aucune valeur n'a été affichée.\n`);
})();
