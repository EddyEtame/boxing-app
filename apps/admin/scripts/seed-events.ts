/**
 * Graines d'événements d'usage, réalistes et marquées « demo » (source: 'demo').
 *
 * Elles imitent ce que l'app envoie vraiment (apps/mobile/src/features/analytics.ts) :
 * mêmes noms (EVENT_NAMES), mêmes props, même préface (preface_step 2 puis 3,
 * preface_done avec choice 'guest' ou 'member'), mêmes origines du bouton
 * « Créer mon compte » ('home', 'plus', 'locked', 'badge'). Chaque événement passe
 * par la même validation que l'API (src/lib/events.ts) avant d'être écrit.
 *
 * Usage (PowerShell, depuis la racine du dépôt) :
 *   npm run seed:events --workspace apps/admin                (45 jours, remplace les graines précédentes)
 *   npm run seed:events --workspace apps/admin -- --days 90
 *   npm run seed:events:clear --workspace apps/admin          (retire seulement les graines)
 * Les événements réellement envoyés par l'app ne sont jamais touchés.
 */
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import type { ClubId } from '@bc/brand';
import type { AnalyticsEvent, EventName, EventProps, Statut } from '@bc/contract';

import { sanitizeEvent, type StoredEvent } from '../src/lib/events';

const adminDir = path.resolve(__dirname, '..');
const dataDir = process.env.ADMIN_DATA_DIR?.trim() ? path.resolve(process.env.ADMIN_DATA_DIR) : path.join(adminDir, '.data');
const file = path.join(dataDir, 'evenements.jsonl');

const arg = (name: string, fallback: number) => {
  const i = process.argv.indexOf(name);
  const v = i >= 0 ? Number(process.argv[i + 1]) : Number.NaN;
  return Number.isFinite(v) ? v : fallback;
};
const CLEAR = process.argv.includes('--clear');
const DAYS = Math.min(90, Math.max(7, arg('--days', 45)));
const SEED = arg('--seed', 20261022);

/* --- Lecture et réécriture : on garde ce qui vient de l'app -------------- */
function readRows(): StoredEvent[] {
  if (!existsSync(file)) return [];
  return readFileSync(file, 'utf8')
    .split('\n')
    .filter(Boolean)
    .flatMap((l) => {
      try {
        return [JSON.parse(l) as StoredEvent];
      } catch {
        return [];
      }
    });
}

function writeRows(rows: StoredEvent[]) {
  mkdirSync(dataDir, { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  writeFileSync(tmp, rows.map((r) => JSON.stringify(r)).join('\n') + (rows.length ? '\n' : ''), 'utf8');
  renameSync(tmp, file);
}

const existing = readRows();
const kept = existing.filter((r) => r.s !== 'demo');
if (CLEAR) {
  writeRows(kept);
  console.log(`\n✓ ${existing.length - kept.length} événements de démonstration retirés ; ${kept.length} venus de l'app gardés.\n`);
  process.exit(0);
}

/* --- Tirage déterministe (mulberry32) ------------------------------------- */
let state = SEED >>> 0;
const rand = () => {
  state = (state + 0x6d2b79f5) >>> 0;
  let t = state;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const chance = (p: number) => rand() < p;
const int = (a: number, b: number) => a + Math.floor(rand() * (b - a + 1));
function pick<T>(weighted: [T, number][]): T {
  const total = weighted.reduce((n, [, w]) => n + w, 0);
  let x = rand() * total;
  for (const [v, w] of weighted) if ((x -= w) <= 0) return v;
  return weighted[weighted.length - 1]![0];
}
const hex = (n: number) => Array.from({ length: n }, () => Math.floor(rand() * 16).toString(16)).join('');
const uuid = () => `${hex(8)}-${hex(4)}-4${hex(3)}-${pick([['8', 1], ['9', 1], ['a', 1], ['b', 1]])}${hex(3)}-${hex(12)}`;
let seq = 0;
const newId = () => `${(Date.now() + seq++).toString(36)}${hex(8)}`;

/* --- Le monde : cinq clubs, des invités, des adhérents -------------------- */
const CLUB_W: [ClubId, number][] = [
  ['minimes', 30],
  ['etats-unis', 24],
  ['saint-cyprien', 18],
  ['ramonville', 14],
  ['portet', 14],
];
const GUEST_SECTIONS: [string, number][] = [
  ['planning', 62],
  ['actualites', 38],
  ['plus', 30],
  ['disciplines', 27],
  ['combats', 22],
  ['equipe', 18],
  ['badge', 12],
  ['messages', 8],
  ['stats', 6],
];
const FAMILLES: [string, number][] = [
  ['anglaise', 34],
  ['piedsPoings', 22],
  ['mma', 14],
  ['crossTraining', 12],
  ['educative', 8],
  ['grappling', 6],
  ['ladyPunch', 4],
];

type Install = { anonId: string; statut: Statut; locale: 'fr' | 'en'; scheme: 'light' | 'dark'; platform: 'ios' | 'android' | 'web'; club: ClubId };

function install(statut: Statut): Install {
  return {
    anonId: uuid(),
    statut,
    locale: chance(0.91) ? 'fr' : 'en',
    scheme: chance(0.58) ? 'dark' : 'light',
    platform: pick([['ios', 54], ['android', 44], ['web', 2]]),
    club: pick(CLUB_W),
  };
}

const now = Date.now();
const DAY = 86_400_000;
const out: AnalyticsEvent[] = [];

/** Une heure locale plausible pour une visite (Toulouse). Une visite qui tomberait plus tard qu'à l'instant n'a pas encore eu lieu : null. */
function visitStart(dayOffset: number, kind: 'guest' | 'member'): number | null {
  const base = new Date(now - dayOffset * DAY);
  const h = kind === 'member' ? pick([[17, 2], [18, 5], [19, 4], [12, 2], [10, 1], [20, 2]]) : pick([[19, 4], [20, 4], [21, 3], [12, 2], [13, 2], [8, 1], [17, 2], [22, 2]]);
  base.setHours(h, int(0, 59), int(0, 59), 0);
  // Une visite dure quelques minutes : on laisse un quart d'heure de marge avant « maintenant ».
  return base.getTime() < now - 15 * 60_000 ? base.getTime() : null;
}

function emit(who: Install, visit: string, at: number, name: EventName, props?: EventProps, pathName?: string) {
  out.push({ id: newId(), name, at: new Date(at).toISOString(), anonId: who.anonId, visit, statut: who.statut, locale: who.locale, scheme: who.scheme, platform: who.platform, appVersion: '1.0.0', ...(pathName ? { path: pathName } : {}), ...(props ? { props } : {}) });
}

function guestVisit(who: Install, start: number, first: boolean): boolean {
  const visit = `v${hex(10)}`;
  let t = start;
  const step = (min: number, max: number) => (t += int(min, max) * 1000);
  emit(who, visit, t, 'app_open');
  if (first) {
    // La préface : langue, ambiance, profil. Environ un sur dix la passe d'un coup.
    if (chance(0.88)) {
      if (chance(0.3)) emit(who, visit, step(2, 6), 'locale_change', { value: who.locale, step: 1 });
      if (chance(0.1)) {
        emit(who, visit, step(2, 5), 'preface_done', { choice: 'guest' });
      } else {
        emit(who, visit, step(3, 9), 'preface_step', { step: 2 });
        if (chance(0.55)) emit(who, visit, step(2, 6), 'theme_change', { value: who.scheme, step: 2 });
        if (!chance(0.93)) return false;
        emit(who, visit, step(3, 9), 'preface_step', { step: 3 });
        if (!chance(0.95)) return false;
        const member = chance(0.2);
        emit(who, visit, step(2, 8), 'preface_done', { choice: member ? 'member' : 'guest' });
        if (member) return true;
      }
    } else return false;
  }
  emit(who, visit, step(1, 4), 'screen_view', { section: 'home' }, '/');
  const screens = int(1, 5);
  for (let i = 0; i < screens; i++) {
    const section = pick(GUEST_SECTIONS);
    emit(who, visit, step(6, 40), 'screen_view', { section }, `/${section}`);
    if (section === 'planning') {
      const club = chance(0.7) ? who.club : pick(CLUB_W);
      const mode = chance(0.7) ? 'jour' : 'semaine';
      emit(who, visit, step(1, 4), 'planning_view', { club, mode });
      if (chance(0.38)) emit(who, visit, step(5, 30), 'planning_session_open', { club, famille: pick(FAMILLES) });
      if (chance(0.07)) emit(who, visit, step(5, 20), 'planning_share', { club, mode });
      if (chance(0.25)) emit(who, visit, step(5, 20), 'planning_view', { club: pick(CLUB_W), mode });
    }
    if ((section === 'messages' || section === 'stats' || section === 'badge') && chance(0.22)) {
      emit(who, visit, step(3, 12), 'cta_create_account', { from: section === 'badge' ? 'badge' : 'locked' });
    }
  }
  if (chance(0.045)) emit(who, visit, step(5, 30), 'cta_create_account', { from: pick([['home', 6], ['plus', 3]]) });
  if (chance(0.03)) emit(who, visit, step(5, 30), 'cta_sign_in', { from: pick([['home', 3], ['plus', 2], ['locked', 1]]) });
  return false;
}

function memberVisit(who: Install, start: number, trainingDay: boolean) {
  const visit = `v${hex(10)}`;
  let t = start;
  const step = (min: number, max: number) => (t += int(min, max) * 1000);
  emit(who, visit, t, 'app_open');
  emit(who, visit, step(1, 3), 'screen_view', { section: 'home' }, '/');
  if (trainingDay && who.statut === 'actif' && chance(0.86)) {
    emit(who, visit, step(2, 10), 'screen_view', { section: 'badge' }, '/badge');
    emit(who, visit, step(0, 1), 'badge_open');
  }
  if (chance(0.38)) {
    const club = chance(0.8) ? who.club : pick(CLUB_W);
    emit(who, visit, step(5, 30), 'screen_view', { section: 'planning' }, '/planning');
    emit(who, visit, step(1, 3), 'planning_view', { club, mode: chance(0.75) ? 'jour' : 'semaine' });
    if (chance(0.25)) emit(who, visit, step(4, 20), 'planning_session_open', { club, famille: pick(FAMILLES) });
    if (chance(0.06)) emit(who, visit, step(3, 10), 'session_favorite', { club, famille: pick(FAMILLES), value: true });
  }
  if (chance(0.24)) {
    emit(who, visit, step(5, 30), 'screen_view', { section: 'stats' }, '/stats');
    emit(who, visit, step(0, 1), 'stats_view', { value: 3 });
  }
  if (who.statut === 'actif' && chance(0.08)) {
    emit(who, visit, step(5, 30), 'screen_view', { section: 'messages' }, '/messages');
    if (chance(0.25)) emit(who, visit, step(20, 90), 'message_send', { channel: 'direction', value: pick([['acces', 3], ['abonnement', 2], ['general', 2], ['info', 1]]) });
  }
  if (chance(0.1)) {
    emit(who, visit, step(5, 30), 'screen_view', { section: 'entrainer' }, '/entrainer');
    if (chance(0.25)) emit(who, visit, step(5, 30), 'training_join', { club: who.club, value: true });
    if (chance(0.04)) emit(who, visit, step(30, 90), 'training_publish', { club: who.club, choice: pick([['sparring-anglaise', 3], ['footing', 2], ['training-collectif', 2]]) });
  }
  if (chance(0.06)) emit(who, visit, step(5, 30), 'screen_view', { section: 'actualites' }, '/actualites');
  if (chance(0.01)) emit(who, visit, step(5, 30), 'bar_save', { value: 'planning,badge,stats' });
}

/* --- La période : les adhérents déjà là, puis chaque jour ses nouveaux invités */
const members: Install[] = Array.from({ length: 230 }, () => install(chance(0.92) ? 'actif' : 'restreint'));
const memberDays = new Map(members.map((m) => [m.anonId, int(2, 4)]));

for (let dayOffset = DAYS - 1; dayOffset >= 0; dayOffset--) {
  const date = new Date(now - dayOffset * DAY);
  const wd = (date.getDay() + 6) % 7;
  const sunday = wd === 6;
  // Les nouveaux visiteurs : plus le lundi, moins le dimanche ; la rentrée est passée, la courbe s'aplatit.
  const newGuests = Math.round((sunday ? 14 : wd === 0 ? 38 : 27) * (0.85 + rand() * 0.35));
  for (let i = 0; i < newGuests; i++) {
    const who = install('invite');
    const first = visitStart(dayOffset, 'guest');
    if (first === null) continue;
    const becameMember = guestVisit(who, first, true);
    if (becameMember) {
      const m: Install = { ...who, statut: 'actif' };
      members.push(m);
      memberDays.set(m.anonId, int(2, 4));
      const login = first + int(2, 20) * 60_000;
      if (login < now - 60_000) memberVisit(m, login, false);
      continue;
    }
    // Les retours : un sur deux revient, parfois plusieurs fois, dans les jours qui suivent (jamais dans le futur).
    let back = dayOffset;
    while (chance(0.5)) {
      back -= int(1, 6);
      if (back < 0) break;
      const start = visitStart(back, 'guest');
      if (start !== null) guestVisit(who, start, false);
    }
  }
  for (const m of members) {
    const perWeek = memberDays.get(m.anonId) ?? 3;
    const training = !sunday && chance(perWeek / 6);
    if (!training && !chance(0.12)) continue;
    const start = visitStart(dayOffset, 'member');
    if (start !== null) memberVisit(m, start, training);
  }
}

/* --- Validation (la même que l'API), puis écriture ------------------------- */
const receivedAt = new Date().toISOString();
const valid: StoredEvent[] = [];
let refused = 0;
for (const e of out) {
  // Même validation que l'API, avec l'âge de l'historique demandé (l'API, elle, accepte un mois de retard).
  const res = sanitizeEvent(e, now + 60_000, (DAYS + 1) * DAY);
  if (res.ok) valid.push({ e: res.event, r: receivedAt, s: 'demo' });
  else refused++;
}
valid.sort((a, b) => (a.e.at < b.e.at ? -1 : 1));
writeRows([...kept, ...valid]);

const by = new Map<string, number>();
for (const v of valid) by.set(v.e.name, (by.get(v.e.name) ?? 0) + 1);
const guests = new Set(valid.filter((v) => v.e.statut === 'invite').map((v) => v.e.anonId)).size;
const memberCount = new Set(valid.filter((v) => v.e.statut !== 'invite').map((v) => v.e.anonId)).size;
console.log('');
console.log(`✓ ${valid.length} événements de démonstration sur ${DAYS} jours (graine ${SEED})${refused ? `, ${refused} refusés par la validation` : ''}`);
console.log(`  ${guests} installations d'invités · ${memberCount} d'adhérents · ${kept.length} événements venus de l'app gardés`);
console.log(`  ${[...by.entries()].sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k} ${n}`).join(' · ')}`);
console.log(`  Fichier : ${path.relative(path.resolve(adminDir, '..', '..'), file).split(path.sep).join('/')} (ignoré par Git)\n`);
