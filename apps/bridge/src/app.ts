import { randomUUID } from 'node:crypto';

import rateLimit from '@fastify/rate-limit';
import { MEMBER_API, SNAPSHOT_REFRESH_MS, clubFromDeciplusGym, statutFor } from '@bc/contract';
import type { LinkStatus, Me, MemberSnapshot } from '@bc/contract';
import Fastify, { type FastifyInstance, type FastifyReply, type FastifyRequest } from 'fastify';

import { applyMemberStatus, isDecided, profileIsComplete, type FichePayload, type MemberStatusPayload } from './decisions.ts';
import { buildAuthEmail } from './emails.ts';
import type { Env } from './env.ts';
import { parseEventBatch } from './events-in.ts';
import { applyShopEvent, profileReadyForCheckout } from './apply-shop.ts';
import { buildCheckoutUrl, isClubId, normalizeOfferSlug } from './checkout.ts';
import { pushLiveSignal } from './live-signal.ts';
import type { Mailer } from './mailer.ts';
import { gymForClub, type Robot } from './robot.ts';
import { parseShopEventBody } from './shop-in.ts';
import { verifyBridgeSignature, verifyStandardWebhook } from './signature.ts';
import { FicheDejaLieeError, type Profile, type Snapshot, type Store, type VerifyUser } from './store.ts';

export type { Mailer, Robot, Store, VerifyUser };

export type Deps = {
  env: Env;
  store: Store;
  robot: Robot;
  mailer: Mailer;
  verifyUser: VerifyUser;
  now: () => Date;
};

const LINK_GAP_MS = 2 * 60 * 1000;
const LINK_DAY_MS = 24 * 60 * 60 * 1000;
const LINK_DAY_MAX = 5;
/** Une relecture sans retour ne bloque pas les suivantes au-dela de ce delai. */
const REREAD_LOCK_MS = 10 * 60 * 1000;
const SIGNATURE_WINDOW_SEC = 300;

type RequestWithRaw = FastifyRequest & { rawBody?: string };

function header(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? '';
  return value ?? '';
}

function bearer(value: string | string[] | undefined): string | null {
  const match = /^Bearer\s+(\S+)\s*$/i.exec(header(value));
  return match?.[1] ?? null;
}

function textList(value: unknown, maxItems: number, maxLen: number): string[] {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  for (const item of value) {
    if (typeof item !== 'string') continue;
    const trimmed = item.trim();
    if (!trimmed) continue;
    out.push(trimmed.slice(0, maxLen));
    if (out.length >= maxItems) break;
  }
  return out;
}

function nullableText(value: unknown, max: number): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, max) : null;
}

function parseFiche(value: unknown): FichePayload | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const fiche = value as Record<string, unknown>;
  return {
    abonnement_actif: fiche.abonnement_actif === true,
    abonnement_en_attente: fiche.abonnement_en_attente === true,
    badge_enregistre: fiche.badge_enregistre === true,
    contrats: textList(fiche.contrats, 8, 120),
    club: nullableText(fiche.club, 40),
  };
}

function parseMemberStatus(body: unknown): (MemberStatusPayload & { order_id: string }) | null {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return null;
  const row = body as Record<string, unknown>;
  const orderId = nullableText(row.order_id, 80);
  if (!orderId) return null;
  if (row.decision !== 'lie' && row.decision !== 'a_revoir' && row.decision !== 'prospect') return null;
  return {
    order_id: orderId,
    decision: row.decision,
    deciplus_member_id: nullableText(row.deciplus_member_id, 64),
    mismatch_fields: textList(row.mismatch_fields, 20, 64),
    reason: nullableText(row.reason, 500),
    fiche: row.fiche == null ? null : parseFiche(row.fiche),
    read_at: typeof row.read_at === 'string' ? row.read_at : '',
  };
}

function parseAdminBody(body: unknown): { link_request_id: string; resolution: 'lie' | 'refuse'; actor: string } | null {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return null;
  const row = body as Record<string, unknown>;
  const id = nullableText(row.link_request_id, 80);
  const actor = nullableText(row.actor, 80);
  if (!id || !actor) return null;
  if (row.resolution !== 'lie' && row.resolution !== 'refuse') return null;
  return { link_request_id: id, resolution: row.resolution, actor };
}

function toSnapshot(row: Snapshot | null): MemberSnapshot | null {
  if (!row) return null;
  return {
    abonnementActif: row.abonnement_actif,
    abonnementEnAttente: row.abonnement_en_attente,
    badgeEnregistre: row.badge_enregistre,
    contrats: row.contrats.slice(0, 8),
    club: clubFromDeciplusGym(row.club),
    readAt: row.read_at,
  };
}

function toMe(profile: Profile, row: Snapshot | null): Me {
  const snapshot = toSnapshot(row);
  const statut = profile.consentement_parental_requis ? 'restreint' : statutFor(profile.link_status, snapshot);
  return {
    id: profile.id,
    prenom: profile.prenom,
    nom: profile.nom,
    email: profile.email,
    telephone: profile.telephone,
    dateNaissance: profile.date_naissance ?? '',
    statut,
    link: { status: profile.link_status, updatedAt: profile.link_updated_at },
    clubPrincipal: clubFromDeciplusGym(profile.club_principal),
    snapshot,
    consentementParentalRequis: profile.consentement_parental_requis,
    passages: [],
  };
}

function customerOf(profile: Profile): { firstName: string; lastName: string; email: string; phone: string; birthdate: string } {
  return {
    firstName: profile.prenom,
    lastName: profile.nom,
    email: profile.email,
    phone: profile.telephone,
    birthdate: profile.date_naissance ?? '',
  };
}

function signed(req: FastifyRequest, secret: string, nowSec: number): boolean {
  const raw = (req as RequestWithRaw).rawBody ?? '';
  return verifyBridgeSignature({
    secret,
    timestamp: header(req.headers['x-bc-timestamp']),
    signature: header(req.headers['x-bc-signature']),
    rawBody: raw,
    nowSec,
    toleranceSec: SIGNATURE_WINDOW_SEC,
  });
}

export async function buildApp(deps: Deps): Promise<FastifyInstance> {
  const testing = process.execArgv.includes('--test') || process.argv.includes('--test') || process.env.NODE_TEST_CONTEXT != null;
  const app = Fastify({
    trustProxy: true,
    logger: {
      level: testing ? 'silent' : 'info',
      redact: {
        paths: [
          'req.headers.authorization',
          'req.body.email',
          'req.body.telephone',
          'req.body.phone',
          'req.body.user.email',
          'req.body.customer.email',
          'req.body.customer.phone',
        ],
        censor: '[redige]',
      },
    },
  });

  app.removeContentTypeParser('application/json');
  app.addContentTypeParser(/^application\/json(?:;.*)?$/, { parseAs: 'string' }, (req, body, done) => {
    const raw = typeof body === 'string' ? body : String(body);
    (req as RequestWithRaw).rawBody = raw;
    if (raw.trim() === '') {
      done(null, null);
      return;
    }
    try {
      done(null, JSON.parse(raw) as unknown);
    } catch {
      const err = new Error('JSON invalide') as Error & { statusCode?: number };
      err.statusCode = 400;
      done(err, undefined);
    }
  });

  await app.register(rateLimit, {
    global: true,
    max: 120,
    timeWindow: '1 minute',
  });

  app.setErrorHandler((error, req, reply) => {
    const statusCode = (error as { statusCode?: unknown }).statusCode;
    const status = typeof statusCode === 'number' ? statusCode : 500;
    if (status >= 500) req.log.error({ err: error }, 'erreur interne');
    const code = status >= 400 && status < 600 ? status : 500;
    if (code === 429) {
      reply.code(429).send({ error: 'trop_de_requetes' });
      return;
    }
    reply.code(code).send({ error: code === 400 ? 'requete_invalide' : 'erreur_interne' });
  });

  async function authenticate(req: FastifyRequest, reply: FastifyReply): Promise<{ id: string; email: string; emailConfirmed: boolean } | null> {
    const token = bearer(req.headers.authorization);
    if (!token) {
      reply.code(401).send({ error: 'non_authentifie' });
      return null;
    }
    const user = await deps.verifyUser(token);
    if (!user) {
      reply.code(401).send({ error: 'non_authentifie' });
      return null;
    }
    return user;
  }

  async function sendLookup(profile: Profile, orderId: string, memberId: string | null): Promise<void> {
    await deps.robot.sendLookup({
      orderId,
      gym: gymForClub(profile.club_principal),
      ...(memberId ? { deciplusMemberId: memberId } : {}),
      customer: customerOf(profile),
    });
  }

  async function openRequest(profile: Profile, memberId: string | null): Promise<{ id: string; orderId: string }> {
    const orderId = `app-${randomUUID()}`;
    const created = await deps.store.insertLinkRequest({
      profile_id: profile.id,
      order_id: orderId,
      status: 'envoye',
      deciplus_member_id: memberId,
    });
    return { id: created.id, orderId };
  }

  app.get(MEMBER_API.health, async () => {
    const robot = await deps.robot.health();
    if (!('ready' in robot)) return { ok: true, robot: { ok: false as const } };
    return { ok: true, robot: { ok: robot.ok, ready: robot.ready, version: robot.version } };
  });

  app.get(MEMBER_API.me, async (req, reply) => {
    const user = await authenticate(req, reply);
    if (!user) return;
    const profile = await deps.store.getProfile(user.id);
    if (!profile) {
      reply.code(404).send({ error: 'profil_introuvable' });
      return;
    }
    const snapshot = await deps.store.getSnapshot(profile.id);
    reply.send(toMe(profile, snapshot));
  });

  app.post(MEMBER_API.link, async (req, reply) => {
    const user = await authenticate(req, reply);
    if (!user) return;
    if (!user.emailConfirmed) {
      reply.code(403).send({ error: 'email_non_verifie' });
      return;
    }
    const profile = await deps.store.getProfile(user.id);
    if (!profile) {
      reply.code(404).send({ error: 'profil_introuvable' });
      return;
    }
    if (profile.link_status === 'lie') {
      reply.code(200).send({ status: 'lie' satisfies LinkStatus });
      return;
    }
    if (!profileIsComplete(profile)) {
      reply.code(409).send({ error: 'profil_incomplet' });
      return;
    }
    const now = deps.now();
    const recent = await deps.store.countLinkRequestsSince(profile.id, new Date(now.getTime() - LINK_GAP_MS).toISOString());
    const day = await deps.store.countLinkRequestsSince(profile.id, new Date(now.getTime() - LINK_DAY_MS).toISOString());
    if (recent >= 1 || day >= LINK_DAY_MAX) {
      reply.code(429).send({ error: 'trop_de_demandes' });
      return;
    }
    const opened = await openRequest(profile, null);
    await deps.store.updateProfile(profile.id, { link_status: 'en_attente', link_updated_at: now.toISOString() });
    try {
      await sendLookup(profile, opened.orderId, null);
    } catch (err) {
      await deps.store.updateLinkRequest(opened.id, { status: 'erreur', reason: 'robot_indisponible' });
      req.log.error({ err, orderId: opened.orderId }, 'robot injoignable');
      reply.code(503).send({ error: 'robot_indisponible' });
      return;
    }
    reply.code(202).send({ status: 'en_attente' satisfies LinkStatus });
  });

  app.post(MEMBER_API.refresh, async (req, reply) => {
    const user = await authenticate(req, reply);
    if (!user) return;
    const profile = await deps.store.getProfile(user.id);
    if (!profile) {
      reply.code(404).send({ error: 'profil_introuvable' });
      return;
    }
    if (profile.link_status === 'lie' && profile.deciplus_member_id) {
      const current = await deps.store.getSnapshot(profile.id);
      const age = current ? deps.now().getTime() - Date.parse(current.read_at) : Number.POSITIVE_INFINITY;
      const stale = !current || !Number.isFinite(age) || age >= SNAPSHOT_REFRESH_MS;
      if (stale) {
        const since = new Date(deps.now().getTime() - REREAD_LOCK_MS).toISOString();
        const busy = await deps.store.hasInFlightReread(profile.id, since);
        if (!busy) {
          const opened = await openRequest(profile, profile.deciplus_member_id);
          try {
            await sendLookup(profile, opened.orderId, profile.deciplus_member_id);
          } catch (err) {
            await deps.store.updateLinkRequest(opened.id, { status: 'erreur', reason: 'robot_indisponible' });
            req.log.error({ err, orderId: opened.orderId }, 'relecture impossible');
          }
        }
      }
    }
    const fresh = (await deps.store.getProfile(profile.id)) ?? profile;
    const snapshot = await deps.store.getSnapshot(profile.id);
    reply.send(toMe(fresh, snapshot));
  });

  app.delete(MEMBER_API.me, async (req, reply) => {
    const user = await authenticate(req, reply);
    if (!user) return;
    await deps.store.insertAudit({
      actor: user.id,
      action: 'compte_supprime',
      target: user.id,
      details: { user_id: user.id },
    });
    await deps.store.deleteAccount(user.id);
    reply.code(204).send();
  });

  app.get(MEMBER_API.invoices, async (req, reply) => {
    const user = await authenticate(req, reply);
    if (!user) return;
    const rows = await deps.store.listInvoices(user.id);
    reply.send({
      items: rows.map((row) => ({
        id: row.id,
        invoiceNumber: row.invoice_number,
        label: row.label,
        amountTtcCents: row.amount_ttc_cents,
        issuedAt: row.issued_at,
        status: row.status,
      })),
    });
  });

  app.post(MEMBER_API.checkoutSessions, async (req, reply) => {
    const user = await authenticate(req, reply);
    if (!user) return;
    if (!user.emailConfirmed) {
      reply.code(403).send({ error: 'email_non_verifie' });
      return;
    }
    const profile = await deps.store.getProfile(user.id);
    if (!profile) {
      reply.code(404).send({ error: 'profil_introuvable' });
      return;
    }
    if (!profileReadyForCheckout(profile)) {
      reply.code(409).send({ error: 'profil_incomplet' });
      return;
    }
    const body = req.body;
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      reply.code(400).send({ error: 'requete_invalide' });
      return;
    }
    const offerSlug = normalizeOfferSlug((body as { offerSlug?: unknown }).offerSlug);
    const clubRaw = typeof (body as { club?: unknown }).club === 'string' ? (body as { club: string }).club : '';
    if (!offerSlug || !isClubId(clubRaw)) {
      reply.code(400).send({ error: 'requete_invalide' });
      return;
    }
    const now = deps.now();
    const expires = new Date(now.getTime() + 45 * 60 * 1000);
    const session = await deps.store.insertCheckoutSession({
      profile_id: profile.id,
      offer_slug: offerSlug,
      club: clubRaw,
      expires_at: expires.toISOString(),
    });
    const checkoutUrl = buildCheckoutUrl(
      deps.env.BOUTIQUE_CHECKOUT_BASE_URL,
      session.id,
      profile.id,
      Math.floor(expires.getTime() / 1000),
      deps.env.APP_BRIDGE_SECRET,
      offerSlug,
      clubRaw,
    );
    reply.code(201).send({
      id: session.id,
      status: session.status,
      checkoutUrl,
      expiresAt: session.expires_at,
    });
  });

  app.get('/v1/checkout/sessions/:id', async (req, reply) => {
    const user = await authenticate(req, reply);
    if (!user) return;
    const id = typeof (req.params as { id?: unknown }).id === 'string' ? (req.params as { id: string }).id : '';
    if (!id) {
      reply.code(400).send({ error: 'requete_invalide' });
      return;
    }
    const session = await deps.store.getCheckoutSessionForProfile(id, user.id);
    if (!session) {
      reply.code(404).send({ error: 'checkout_introuvable' });
      return;
    }
    reply.send({
      id: session.id,
      status: session.status,
      offerSlug: session.offer_slug,
      club: session.club,
      boxplusOrderId: session.boxplus_order_id,
      updatedAt: session.updated_at,
      expiresAt: session.expires_at,
    });
  });

  app.post('/internal/shop-event', async (req, reply) => {
    const nowSec = Math.floor(deps.now().getTime() / 1000);
    if (!signed(req, deps.env.SHOP_BRIDGE_SECRET, nowSec)) {
      reply.code(401).send({ error: 'signature_invalide' });
      return;
    }
    const event = parseShopEventBody(req.body);
    if (!event) {
      reply.code(400).send({ error: 'requete_invalide' });
      return;
    }
    const result = await applyShopEvent(deps.store, event, deps.now());
    if (!result.ok) {
      reply.code(404).send({ error: result.reason });
      return;
    }
    await pushLiveSignal(deps.env, {
      domain: 'commerce.checkout',
      action: event.type,
      payload: {
        eventId: event.event_id,
        orderId: event.order_id ?? null,
        checkoutSessionId: event.checkout_session_id ?? null,
      },
    });
    reply.code(200).send({ ok: true });
  });

  app.post('/v1/events', { config: { rateLimit: { max: 30, timeWindow: '1 minute' } } }, async (req, reply) => {
    const batch = parseEventBatch(req.body);
    if (!batch.ok) {
      reply.code(400).send({ error: batch.error });
      return;
    }
    await deps.store.insertEvents(batch.events);
    reply.code(204).send();
  });

  app.post('/internal/app-member-status', async (req, reply) => {
    const nowSec = Math.floor(deps.now().getTime() / 1000);
    if (!signed(req, deps.env.APP_BRIDGE_SECRET, nowSec)) {
      reply.code(401).send({ error: 'signature_invalide' });
      return;
    }
    const payload = parseMemberStatus(req.body);
    if (!payload) {
      reply.code(400).send({ error: 'requete_invalide' });
      return;
    }
    const request = await deps.store.getLinkRequestByOrderId(payload.order_id);
    if (!request) {
      reply.code(404).send({ error: 'demande_inconnue' });
      return;
    }
    if (isDecided(request)) {
      reply.code(200).send({ status: request.status });
      return;
    }
    const status = await applyMemberStatus(deps.store, request, payload, deps.now());
    reply.code(200).send({ status });
  });

  app.post('/internal/admin/link-resolution', async (req, reply) => {
    const nowSec = Math.floor(deps.now().getTime() / 1000);
    if (!signed(req, deps.env.ADMIN_BRIDGE_SECRET, nowSec)) {
      reply.code(401).send({ error: 'signature_invalide' });
      return;
    }
    const body = parseAdminBody(req.body);
    if (!body) {
      reply.code(400).send({ error: 'requete_invalide' });
      return;
    }
    const request = await deps.store.getLinkRequestById(body.link_request_id);
    if (!request) {
      reply.code(404).send({ error: 'demande_inconnue' });
      return;
    }
    if (request.status === 'resolu') {
      reply.code(409).send({ error: 'deja_resolue' });
      return;
    }
    const profile = await deps.store.getProfile(request.profile_id);
    if (!profile) {
      reply.code(404).send({ error: 'profil_introuvable' });
      return;
    }
    const nowIso = deps.now().toISOString();
    if (body.resolution === 'refuse') {
      await deps.store.updateProfile(profile.id, {
        link_status: 'prospect',
        link_updated_at: nowIso,
        deciplus_member_id: null,
      });
      await deps.store.updateLinkRequest(request.id, {
        status: 'resolu',
        resolution: 'refuse',
        resolved_by: body.actor,
        resolved_at: nowIso,
      });
      await deps.store.insertAudit({
        actor: body.actor,
        action: 'lien_refuse',
        target: profile.id,
        details: { link_request_id: request.id },
      });
      reply.code(200).send({ status: 'prospect' satisfies LinkStatus });
      return;
    }
    const memberId = request.deciplus_member_id;
    if (!memberId) {
      reply.code(409).send({ error: 'identifiant_manquant' });
      return;
    }
    const taken = await deps.store.findOtherProfileByMemberId(memberId, profile.id);
    if (taken) {
      reply.code(409).send({ error: 'fiche_deja_liee' });
      return;
    }
    try {
      await deps.store.updateProfile(profile.id, {
        link_status: 'lie',
        link_updated_at: nowIso,
        deciplus_member_id: memberId,
      });
    } catch (err) {
      if (err instanceof FicheDejaLieeError) {
        reply.code(409).send({ error: 'fiche_deja_liee' });
        return;
      }
      throw err;
    }
    await deps.store.updateLinkRequest(request.id, {
      status: 'resolu',
      resolution: 'lie',
      resolved_by: body.actor,
      resolved_at: nowIso,
      deciplus_member_id: memberId,
    });
    await deps.store.insertAudit({
      actor: body.actor,
      action: 'lien_valide',
      target: profile.id,
      details: { link_request_id: request.id, deciplus_member_id: memberId },
    });
    const linked = (await deps.store.getProfile(profile.id)) ?? { ...profile, link_status: 'lie' as const, deciplus_member_id: memberId };
    const opened = await openRequest(linked, memberId);
    try {
      await sendLookup(linked, opened.orderId, memberId);
    } catch (err) {
      await deps.store.updateLinkRequest(opened.id, { status: 'erreur', reason: 'robot_indisponible' });
      req.log.error({ err, orderId: opened.orderId }, 'relecture impossible');
      reply.code(503).send({ error: 'robot_indisponible' });
      return;
    }
    reply.code(200).send({ status: 'lie' satisfies LinkStatus });
  });

  app.post('/internal/admin/shop-health', async (req, reply) => {
    const nowSec = Math.floor(deps.now().getTime() / 1000);
    if (!signed(req, deps.env.ADMIN_BRIDGE_SECRET, nowSec)) {
      reply.code(401).send({ error: 'signature_invalide' });
      return;
    }
    const [events, checkoutAlerts] = await Promise.all([
      deps.store.listShopEventsRecent(40),
      deps.store.listCheckoutAlerts(40),
    ]);
    reply.send({
      generatedAt: deps.now().toISOString(),
      events: events.map((row) => ({
        eventId: row.event_id,
        type: row.type,
        orderId: row.order_id,
        status: row.status,
        receivedAt: row.received_at,
      })),
      checkoutAlerts: checkoutAlerts.map((row) => ({
        id: row.id,
        status: row.status,
        profileId: row.profile_id,
        offerSlug: row.offer_slug,
        club: row.club,
        boxplusOrderId: row.boxplus_order_id,
        updatedAt: row.updated_at,
        errorCode: row.error_code,
      })),
    });
  });

  app.post('/internal/admin/live-bump', async (req, reply) => {
    const nowSec = Math.floor(deps.now().getTime() / 1000);
    if (!signed(req, deps.env.ADMIN_BRIDGE_SECRET, nowSec)) {
      reply.code(401).send({ error: 'signature_invalide' });
      return;
    }
    const body = req.body as { domain?: string; action?: string; payload?: Record<string, unknown>; club?: string; profile_id?: string };
    if (!body?.domain || !body.action) {
      reply.code(400).send({ error: 'requete_invalide' });
      return;
    }
    await pushLiveSignal(deps.env, {
      domain: body.domain,
      action: body.action,
      payload: body.payload ?? {},
      club: body.club ?? null,
      profile_id: body.profile_id ?? null,
    });
    reply.send({ ok: true });
  });

  app.post('/hooks/auth-email', async (req, reply) => {
    const nowSec = Math.floor(deps.now().getTime() / 1000);
    const raw = (req as RequestWithRaw).rawBody ?? '';
    const ok = verifyStandardWebhook({
      secret: deps.env.SEND_EMAIL_HOOK_SECRET,
      id: header(req.headers['webhook-id']),
      timestamp: header(req.headers['webhook-timestamp']),
      signature: header(req.headers['webhook-signature']),
      rawBody: raw,
      nowSec,
      toleranceSec: SIGNATURE_WINDOW_SEC,
    });
    if (!ok) {
      reply.code(401).send({ error: 'signature_invalide' });
      return;
    }
    const body = req.body;
    if (!body || typeof body !== 'object') {
      reply.code(400).send({ error: 'requete_invalide' });
      return;
    }
    const row = body as {
      user?: { email?: unknown; user_metadata?: { prenom?: unknown } };
      email_data?: { token?: unknown; token_new?: unknown; email_action_type?: unknown };
    };
    const email = typeof row.user?.email === 'string' ? row.user.email.trim() : '';
    const action = typeof row.email_data?.email_action_type === 'string' ? row.email_data.email_action_type : 'magiclink';
    const token = typeof row.email_data?.token === 'string' ? row.email_data.token.trim() : '';
    const tokenNew = typeof row.email_data?.token_new === 'string' ? row.email_data.token_new.trim() : '';
    const code = (action === 'email_change' && tokenNew ? tokenNew : token).slice(0, 32);
    const prenom = typeof row.user?.user_metadata?.prenom === 'string' ? row.user.user_metadata.prenom : null;
    if (!email || !code) {
      reply.code(400).send({ error: 'requete_invalide' });
      return;
    }
    const message = buildAuthEmail({ action, prenom, code });
    try {
      await deps.mailer.send({ to: email, subject: message.subject, html: message.html, text: message.text });
    } catch (err) {
      const messageText = err instanceof Error ? err.message : 'envoi impossible';
      reply.code(500).send({ error: { http_code: 500, message: messageText } });
      return;
    }
    reply.code(200).send({});
  });

  return app;
}
