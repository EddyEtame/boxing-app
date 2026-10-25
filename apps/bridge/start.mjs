import { spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
let stopping = false;

function pipe(name, stream) {
  if (!stream) return;
  let buf = '';
  stream.setEncoding('utf8');
  stream.on('data', (chunk) => {
    buf += chunk;
    const lines = buf.split(/\r?\n/);
    buf = lines.pop() ?? '';
    for (const line of lines) console.log(`[${name}] ${line}`);
  });
  stream.on('end', () => {
    if (buf) console.log(`[${name}] ${buf}`);
  });
}

function supervise(name, command, args, options) {
  const slot = { child: null };
  const start = () => {
    if (stopping) return;
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: options.env,
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    });
    slot.child = child;
    pipe(name, child.stdout);
    pipe(name, child.stderr);
    child.on('error', (err) => {
      console.log(`[${name}] lancement impossible: ${err.message}`);
    });
    child.on('exit', (code, signal) => {
      if (stopping) return;
      console.log(`[${name}] arret (${code ?? signal}), relance dans 5 s`);
      setTimeout(start, 5000);
    });
  };
  start();
  return slot;
}

const slots = [];

if (process.env.ROBOT_DIR) {
  slots.push(supervise('robot', process.execPath, ['bot/index.js'], {
    cwd: process.env.ROBOT_DIR,
    env: { ...process.env, BOT_ROLE: 'app' },
  }));
}

if (process.env.CLOUDFLARE_TUNNEL_TOKEN) {
  const bin = process.env.CLOUDFLARED_BIN || join(root, 'bin', 'cloudflared');
  slots.push(supervise('tunnel', bin, ['tunnel', '--no-autoupdate', 'run', '--token', process.env.CLOUDFLARE_TUNNEL_TOKEN], {
    cwd: root,
    env: process.env,
  }));
}

slots.push(supervise('bridge', process.execPath, [
  '--experimental-strip-types',
  '--import',
  './src/register.mjs',
  '--env-file-if-exists=.env',
  'src/server.ts',
], {
  cwd: root,
  env: process.env,
}));

function shutdown() {
  if (stopping) return;
  stopping = true;
  for (const slot of slots) {
    if (slot.child && !slot.child.killed) slot.child.kill();
  }
}

process.on('SIGINT', () => {
  shutdown();
  process.exit(0);
});
process.on('SIGTERM', () => {
  shutdown();
  process.exit(0);
});
