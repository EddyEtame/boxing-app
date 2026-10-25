import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { test } from 'node:test';

import type { FastifyInstance } from 'fastify';

import type { Env } from '../src/env.ts';
import { readEnv } from '../src/env.ts';
import type { LookupJob, Robot } from '../src/robot.ts';
import { hmacHex, webhookKey } from '../src/signature.ts';
import type { Mailer, OutboundMail } from '../src/mailer.ts';
import type { Profile, VerifyUser } from '../src/store.ts';
import { buildApp, type Deps } from '../src/app.ts';
import { MemoryStore } from './memory-store.ts';

const NOW = new Date('2026-10-25T12:00:00.000Z');
const NOW_SEC = Math.floor(NOW.getTime() / 1000);

const env: Env = {
  PORT: 8080,
  HOST: '127.0.0.1',
  PUBLIC_URL: 'https://api.boxingcenter.fr',
  SUPABASE_URL: 'https://example.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'service-role',
  BOT_URL: 'http://127.0.0.1:3050',
  BOT_SYNC_SECRET: 'bot-secret',
  APP_BRIDGE_SECRET: 'app-secret',
  ADMIN_BRIDGE_SECRET: 'admin-secret',
  SEND_EMAIL_HOOK_SECRET: `v1,whsec_${Buffer.from('hook-secret-key').toString('base64')}`,
  BREVO_API_KEY: 'brevo-key',
  BREVO_SENDER_EMAIL: 'suzinabot@gmail.com',
  BREVO_SENDER_NAME: 'Boxing Center',
  BREVO_REPLY_TO: 'boxingcenter31@gmail.com',
};

const userA = { id: 'profil-a', email: 'ada@boxingcenter.fr', emailConfirmed: true };
const userB = { id: 'profil-b', email: 'bia@boxingcenter.fr', emailConfirmed: true };
const userUnverified = { id: 'profil-c', email: 'cam@boxingcenter.fr', emailConfirmed: false };

function profile(over: Partial<Profile> = {}): Profile {
  return {
    id: userA.id,
    prenom: 'Ada',
    nom: 'Martin',
    email: userA.email,
    telephone: '0612345678',
    date_naissance: '1990-04-12',
    club_principal: 'minimes',
    link_status: 'prospect',
    link_updated_at: null,
    deciplus_member_id: null,
    consentement_parental_requis: false,
    ...over,
  };
}

function fakeRobot(): Robot & { jobs: LookupJob[]; down: boolean } {
  const jobs: LookupJob[] = [];
  const robot = {
    jobs,
    down: false,
    async sendLookup(job: LookupJob) {
      if (robot.down) throw new Error('robot_indisponible');
      jobs.push(job);
    },
    async health() {
      return { ok: true as const, ready: true, version: 'test' };
    },
  };
  return robot;
}

function fakeMailer(): Mailer & { sent: OutboundMail[]; fail: boolean } {
  const sent: OutboundMail[] = [];
  const mailer = {
    sent,
    fail: false,
    async send(mail: OutboundMail) {
      if (mailer.fail) throw new Error('brevo indisponible');
      sent.push(mail);
    },
  };
  return mailer;
}

const verifyUser: VerifyUser = async (token) => {
  if (token === 'token-a') return userA;
  if (token === 'token-b') return userB;
  if (token === 'token-non-verifie') return userUnverified;
  return null;
};

async function boot(store = new MemoryStore(() => NOW), robot = fakeRobot(), mailer = fakeMailer()) {
  const deps: Deps = { env, store, robot, mailer, verifyUser, now: () => NOW };
  const app = await buildApp(deps);
  return { app, store, robot, mailer };
}

async function withApp(fn: (ctx: Awaited<ReturnType<typeof boot>>) => Promise<void>) {
  const ctx = await boot();
  try {
    await fn(ctx);
  } finally {
    await ctx.app.close();
  }
}

function sign(secret: string, raw: string, seconds = NOW_SEC) {
  const timestamp = String(seconds);
  return { timestamp, signature: hmacHex(secret, `${timestamp}.${raw}`) };
}

function postSigned(app: FastifyInstance, url: string, raw: string, secret: string, seconds = NOW_SEC) {
  const signed = sign(secret, raw, seconds);
  return app.inject({
    method: 'POST',
    url,
    headers: {
      'content-type': 'application/json',
      'x-bc-timestamp': signed.timestamp,
      'x-bc-signature': signed.signature,
    },
    payload: raw,
  });
}

test('PUBLIC_URL doit etre https', () => {
  assert.throws(() => readEnv({
    PUBLIC_URL: 'http://api.boxingcenter.fr',
    SUPABASE_URL: 'https://example.supabase.co',
    SUPABASE_SERVICE_ROLE_KEY: 'service-role',
    BOT_SYNC_SECRET: 'bot',
    APP_BRIDGE_SECRET: 'app',
    ADMIN_BRIDGE_SECRET: 'admin',
    SEND_EMAIL_HOOK_SECRET: env.SEND_EMAIL_HOOK_SECRET,
    BREVO_API_KEY: 'brevo',
  }));
  const parsed = readEnv({
    PUBLIC_URL: 'https://api.boxingcenter.fr',
    SUPABASE_URL: 'https://example.supabase.co',
    SUPABASE_SERVICE_ROLE_KEY: 'service-role',
    BOT_SYNC_SECRET: 'bot',
    APP_BRIDGE_SECRET: 'app',
    ADMIN_BRIDGE_SECRET: 'admin',
    SEND_EMAIL_HOOK_SECRET: env.SEND_EMAIL_HOOK_SECRET,
    BREVO_API_KEY: 'brevo',
  });
  assert.equal(parsed.PORT, 8080);
  assert.equal(parsed.BREVO_SENDER_EMAIL, 'suzinabot@gmail.com');
  assert.equal(parsed.BOT_URL, 'http://127.0.0.1:3050');
});

test('signature robot invalide ou perimee -> 401', async () => {
  await withApp(async ({ app, store }) => {
    store.profiles.set(userA.id, profile({ link_status: 'en_attente' }));
    store.seedRequest({ profile_id: userA.id, order_id: 'app-sig', status: 'envoye' });
    const raw = JSON.stringify({
      order_id: 'app-sig',
      decision: 'lie',
      deciplus_member_id: 'membre-1',
      mismatch_fields: [],
      reason: null,
      fiche: null,
      read_at: NOW.toISOString(),
    });
    const bad = await postSigned(app, '/internal/app-member-status', raw, 'mauvais-secret');
    assert.equal(bad.statusCode, 401);
    const expired = await postSigned(app, '/internal/app-member-status', raw, env.APP_BRIDGE_SECRET, NOW_SEC - 301);
    assert.equal(expired.statusCode, 401);
    const profileAfter = await store.getProfile(userA.id);
    assert.equal(profileAfter?.link_status, 'en_attente');
  });
});

test('lie avec abonnement actif -> GET /v1/me statut actif', async () => {
  await withApp(async ({ app, store }) => {
    store.profiles.set(userA.id, profile({ link_status: 'en_attente', club_principal: null }));
    store.seedRequest({ profile_id: userA.id, order_id: 'app-lie', status: 'envoye' });
    const raw = JSON.stringify({
      order_id: 'app-lie',
      decision: 'lie',
      deciplus_member_id: 'membre-actif',
      mismatch_fields: [],
      reason: null,
      fiche: {
        abonnement_actif: true,
        abonnement_en_attente: false,
        badge_enregistre: true,
        contrats: ['Adulte'],
        club: 'st-cyprien',
      },
      read_at: '2026-10-25T11:00:00.000Z',
    });
    const posted = await postSigned(app, '/internal/app-member-status', raw, env.APP_BRIDGE_SECRET);
    assert.equal(posted.statusCode, 200);
    const me = await app.inject({ method: 'GET', url: '/v1/me', headers: { authorization: 'Bearer token-a' } });
    assert.equal(me.statusCode, 200);
    const body = me.json();
    assert.equal(body.statut, 'actif');
    assert.equal(body.link.status, 'lie');
    assert.equal(body.snapshot.abonnementActif, true);
    assert.equal(body.snapshot.club, 'saint-cyprien');
    assert.equal(body.clubPrincipal, 'saint-cyprien');
    assert.deepEqual(body.passages, []);
  });
});

test('lie avec un deciplus_member_id deja pris -> a_revoir', async () => {
  await withApp(async ({ app, store }) => {
    store.profiles.set(userA.id, profile({ link_status: 'en_attente' }));
    store.profiles.set(userB.id, profile({ id: userB.id, email: userB.email, link_status: 'lie', deciplus_member_id: 'membre-pris' }));
    store.seedRequest({ profile_id: userA.id, order_id: 'app-conflit', status: 'envoye' });
    const raw = JSON.stringify({
      order_id: 'app-conflit',
      decision: 'lie',
      deciplus_member_id: 'membre-pris',
      mismatch_fields: ['email'],
      reason: null,
      fiche: {
        abonnement_actif: true,
        abonnement_en_attente: false,
        badge_enregistre: false,
        contrats: [],
        club: 'minimes',
      },
      read_at: NOW.toISOString(),
    });
    const posted = await postSigned(app, '/internal/app-member-status', raw, env.APP_BRIDGE_SECRET);
    assert.equal(posted.statusCode, 200);
    assert.equal(posted.json().status, 'a_revoir');
    const mine = await store.getProfile(userA.id);
    const other = await store.getProfile(userB.id);
    assert.equal(mine?.link_status, 'a_revoir');
    assert.equal(mine?.deciplus_member_id, null);
    assert.equal(other?.deciplus_member_id, 'membre-pris');
    const request = await store.getLinkRequestByOrderId('app-conflit');
    assert.equal(request?.reason, 'fiche_deja_liee');
    assert.equal(request?.status, 'a_revoir');
  });
});

test('refresh d\'un profil lie envoie deciplus_member_id', async () => {
  await withApp(async ({ app, store, robot }) => {
    store.profiles.set(userA.id, profile({ link_status: 'lie', deciplus_member_id: 'membre-5', club_principal: 'saint-cyprien' }));
    const res = await app.inject({ method: 'POST', url: '/v1/me/refresh', headers: { authorization: 'Bearer token-a' } });
    assert.equal(res.statusCode, 200);
    assert.equal(res.json().statut, 'restreint');
    assert.equal(robot.jobs.length, 1);
    assert.equal(robot.jobs[0]?.deciplusMemberId, 'membre-5');
    assert.equal(robot.jobs[0]?.gym, 'st-cyprien');
    const again = await app.inject({ method: 'POST', url: '/v1/me/refresh', headers: { authorization: 'Bearer token-a' } });
    assert.equal(again.statusCode, 200);
    assert.equal(robot.jobs.length, 1);
  });
});

test('POST /v1/link refuse un e-mail non confirme', async () => {
  await withApp(async ({ app, robot }) => {
    const res = await app.inject({ method: 'POST', url: '/v1/link', headers: { authorization: 'Bearer token-non-verifie' } });
    assert.equal(res.statusCode, 403);
    assert.equal(res.json().error, 'email_non_verifie');
    assert.equal(robot.jobs.length, 0);
  });
});

test('POST /v1/link 429 au-dela de la limite', async () => {
  await withApp(async ({ app, store, robot }) => {
    store.profiles.set(userA.id, profile());
    store.seedRequest({
      profile_id: userA.id,
      order_id: 'app-recent',
      status: 'erreur',
      created_at: new Date(NOW.getTime() - 30_000).toISOString(),
    });
    const gap = await app.inject({ method: 'POST', url: '/v1/link', headers: { authorization: 'Bearer token-a' } });
    assert.equal(gap.statusCode, 429);
    assert.equal(gap.json().error, 'trop_de_demandes');
    assert.equal(robot.jobs.length, 0);

    store.requests.length = 0;
    for (let i = 0; i < 5; i += 1) {
      store.seedRequest({
        profile_id: userA.id,
        order_id: `app-jour-${i}`,
        status: 'erreur',
        created_at: new Date(NOW.getTime() - 3 * 60 * 60 * 1000).toISOString(),
      });
    }
    const day = await app.inject({ method: 'POST', url: '/v1/link', headers: { authorization: 'Bearer token-a' } });
    assert.equal(day.statusCode, 429);
    assert.equal(robot.jobs.length, 0);
  });
});

test('POST /v1/link 503 si le robot est injoignable', async () => {
  await withApp(async ({ app, store, robot }) => {
    store.profiles.set(userA.id, profile({ club_principal: 'saint-cyprien' }));
    robot.down = true;
    const res = await app.inject({ method: 'POST', url: '/v1/link', headers: { authorization: 'Bearer token-a' } });
    assert.equal(res.statusCode, 503);
    assert.equal(res.json().error, 'robot_indisponible');
    assert.equal(store.requests.length, 1);
    assert.equal(store.requests[0]?.status, 'erreur');
    assert.equal(store.requests[0]?.order_id.startsWith('app-'), true);
    const current = await store.getProfile(userA.id);
    assert.equal(current?.link_status, 'en_attente');
  });
});

test('un mineur reste restreint meme lie et actif', async () => {
  await withApp(async ({ app, store }) => {
    store.profiles.set(userA.id, profile({
      link_status: 'lie',
      deciplus_member_id: 'membre-mineur',
      consentement_parental_requis: true,
      date_naissance: '2014-01-01',
    }));
    await store.upsertSnapshot({
      profile_id: userA.id,
      abonnement_actif: true,
      abonnement_en_attente: false,
      badge_enregistre: true,
      contrats: ['Jeune'],
      club: 'minimes',
      read_at: NOW.toISOString(),
    });
    const me = await app.inject({ method: 'GET', url: '/v1/me', headers: { authorization: 'Bearer token-a' } });
    assert.equal(me.statusCode, 200);
    const body = me.json();
    assert.equal(body.statut, 'restreint');
    assert.equal(body.link.status, 'lie');
    assert.equal(body.consentementParentalRequis, true);
    assert.equal(body.snapshot.abonnementActif, true);
  });
});

test('crochet e-mail : signature valide envoie le code, signature invalide -> 401', async () => {
  await withApp(async ({ app, mailer }) => {
    const raw = JSON.stringify({
      user: { email: 'ada@boxingcenter.fr', user_metadata: { prenom: 'Ada' } },
      email_data: {
        token: '123456',
        token_hash: 'hash',
        redirect_to: '',
        email_action_type: 'signup',
        site_url: 'https://boxingcenter.fr',
        token_new: '',
        token_hash_new: '',
      },
    });
    const id = 'msg_test_1';
    const timestamp = String(NOW_SEC);
    const signature = createHmac('sha256', webhookKey(env.SEND_EMAIL_HOOK_SECRET))
      .update(`${id}.${timestamp}.${raw}`)
      .digest('base64');
    const ok = await app.inject({
      method: 'POST',
      url: '/hooks/auth-email',
      headers: {
        'content-type': 'application/json',
        'webhook-id': id,
        'webhook-timestamp': timestamp,
        'webhook-signature': `v1,${signature}`,
      },
      payload: raw,
    });
    assert.equal(ok.statusCode, 200);
    assert.deepEqual(ok.json(), {});
    assert.equal(mailer.sent.length, 1);
    assert.match(mailer.sent[0]?.text ?? '', /123456/);
    assert.match(mailer.sent[0]?.html ?? '', /123456/);
    assert.match(mailer.sent[0]?.text ?? '', /1 heure/);
    assert.equal(mailer.sent[0]?.to, 'ada@boxingcenter.fr');

    const flipped = signature.slice(0, -1) + (signature.endsWith('A') ? 'B' : 'A');
    const bad = await app.inject({
      method: 'POST',
      url: '/hooks/auth-email',
      headers: {
        'content-type': 'application/json',
        'webhook-id': id,
        'webhook-timestamp': timestamp,
        'webhook-signature': `v1,${flipped}`,
      },
      payload: raw,
    });
    assert.equal(bad.statusCode, 401);
    assert.equal(mailer.sent.length, 1);
  });
});

test('resolution admin lie declenche une relecture', async () => {
  await withApp(async ({ app, store, robot }) => {
    store.profiles.set(userA.id, profile({ link_status: 'a_revoir' }));
    const request = store.seedRequest({
      id: 'demande-admin',
      profile_id: userA.id,
      order_id: 'app-revue',
      status: 'a_revoir',
      deciplus_member_id: 'membre-7',
    });
    const raw = JSON.stringify({ link_request_id: request.id, resolution: 'lie', actor: 'staff-1' });
    const res = await postSigned(app, '/internal/admin/link-resolution', raw, env.ADMIN_BRIDGE_SECRET);
    assert.equal(res.statusCode, 200);
    assert.equal(res.json().status, 'lie');
    const current = await store.getProfile(userA.id);
    assert.equal(current?.link_status, 'lie');
    assert.equal(current?.deciplus_member_id, 'membre-7');
    assert.equal(robot.jobs.length, 1);
    assert.equal(robot.jobs[0]?.deciplusMemberId, 'membre-7');
    const closed = await store.getLinkRequestById(request.id);
    assert.equal(closed?.status, 'resolu');
    assert.equal(closed?.resolution, 'lie');
    assert.equal(store.audits[0]?.action, 'lien_valide');
    assert.equal(store.audits[0]?.actor, 'staff-1');
  });
});

test('POST /v1/events filtre les props', async () => {
  await withApp(async ({ app, store }) => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/events',
      payload: {
        events: [
          {
            id: 'evt-1',
            name: 'app_open',
            at: '2026-10-25T10:00:00.000Z',
            anonId: 'anon-1',
            visit: 'visite-1',
            statut: 'invite',
            locale: 'fr',
            scheme: 'dark',
            platform: 'ios',
            appVersion: '1.0.0',
            props: { club: 'minimes', email: 'secret@boxingcenter.fr', value: 'y'.repeat(80) },
          },
          {
            id: 'evt-1',
            name: 'screen_view',
            at: '2026-10-25T10:01:00.000Z',
            anonId: 'anon-1',
            visit: 'visite-1',
            statut: 'invite',
            locale: 'fr',
            scheme: 'dark',
            platform: 'ios',
            appVersion: '1.0.0',
          },
          {
            id: 'evt-2',
            name: 'pas_un_evenement',
            at: '2026-10-25T10:02:00.000Z',
            anonId: 'anon-1',
            visit: 'visite-1',
            statut: 'invite',
            locale: 'fr',
            scheme: 'dark',
            platform: 'ios',
            appVersion: '1.0.0',
          },
        ],
      },
    });
    assert.equal(res.statusCode, 204);
    assert.equal(store.events.length, 1);
    assert.equal(store.events[0]?.id, 'evt-1');
    assert.equal(store.events[0]?.name, 'app_open');
    assert.deepEqual(store.events[0]?.props, { club: 'minimes', value: 'y'.repeat(64) });
  });
});
