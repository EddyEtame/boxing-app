import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import type { LinkStatus } from '@bc/contract';

import type {
  CheckoutSession,
  CheckoutSessionPatch,
  InvoiceRow,
  NewCheckoutSession,
  NewInvoiceRow,
  NewShopEvent,
  ShopEventRow,
  SubscriptionPatch,
} from './commerce-store.ts';

export type { CheckoutSession, CheckoutSessionPatch, InvoiceRow, NewCheckoutSession, NewInvoiceRow, NewShopEvent, ShopEventRow, SubscriptionPatch };

export class FicheDejaLieeError extends Error {
  constructor() {
    super('fiche_deja_liee');
    this.name = 'FicheDejaLieeError';
  }
}

export type Profile = {
  id: string;
  prenom: string;
  nom: string;
  email: string;
  telephone: string;
  date_naissance: string | null;
  club_principal: string | null;
  link_status: LinkStatus;
  link_updated_at: string | null;
  deciplus_member_id: string | null;
  consentement_parental_requis: boolean;
};

export type ProfilePatch = {
  link_status?: LinkStatus;
  link_updated_at?: string | null;
  deciplus_member_id?: string | null;
  club_principal?: string | null;
};

export type Snapshot = {
  profile_id: string;
  abonnement_actif: boolean;
  abonnement_en_attente: boolean;
  badge_enregistre: boolean;
  contrats: string[];
  club: string | null;
  read_at: string;
};

export type LinkRequestStatus = 'envoye' | 'lie' | 'a_revoir' | 'prospect' | 'erreur' | 'resolu';

export type LinkRequest = {
  id: string;
  profile_id: string;
  order_id: string;
  status: LinkRequestStatus;
  deciplus_member_id: string | null;
  mismatch_fields: string[];
  reason: string | null;
  resolution: 'lie' | 'refuse' | null;
  resolved_by: string | null;
  created_at: string;
  decided_at: string | null;
  resolved_at: string | null;
};

export type NewLinkRequest = {
  profile_id: string;
  order_id: string;
  status: LinkRequestStatus;
  deciplus_member_id?: string | null;
};

export type LinkRequestPatch = {
  status?: LinkRequestStatus;
  deciplus_member_id?: string | null;
  mismatch_fields?: string[];
  reason?: string | null;
  resolution?: 'lie' | 'refuse' | null;
  resolved_by?: string | null;
  decided_at?: string | null;
  resolved_at?: string | null;
};

export type MemberPassage = {
  profile_id: string;
  day: string;
  source: string;
  created_at: string;
};

export type NewMemberPassage = {
  profile_id: string;
  day: string;
  source: string;
};

export type LinkRequestReview = {
  id: string;
  profile_id: string;
  email: string | null;
  status: LinkRequestStatus;
};

export type AuditEntry = {
  actor: string | null;
  action: string;
  target: string | null;
  details: Record<string, unknown>;
};

export type StoredEvent = {
  id: string;
  name: string;
  at: string;
  anon_id: string;
  visit: string;
  statut: string;
  locale: string;
  scheme: string;
  platform: string;
  app_version: string;
  path: string | null;
  props: Record<string, string | number | boolean> | null;
};

export type Store = {
  getProfile(id: string): Promise<Profile | null>;
  updateProfile(id: string, patch: ProfilePatch): Promise<void>;
  getSnapshot(profileId: string): Promise<Snapshot | null>;
  upsertSnapshot(snapshot: Snapshot): Promise<void>;
  countLinkRequestsSince(profileId: string, sinceIso: string): Promise<number>;
  hasInFlightReread(profileId: string, sinceIso: string): Promise<boolean>;
  insertLinkRequest(row: NewLinkRequest): Promise<LinkRequest>;
  getLinkRequestByOrderId(orderId: string): Promise<LinkRequest | null>;
  getLinkRequestById(id: string): Promise<LinkRequest | null>;
  updateLinkRequest(id: string, patch: LinkRequestPatch): Promise<void>;
  listLinkRequestsReview(limit?: number): Promise<LinkRequestReview[]>;
  insertPassageIfNewDay(row: NewMemberPassage): Promise<boolean>;
  listPassages(profileId: string, limit?: number): Promise<MemberPassage[]>;
  findOtherProfileByMemberId(memberId: string, exceptProfileId: string): Promise<boolean>;
  insertAudit(entry: AuditEntry): Promise<void>;
  insertEvents(events: StoredEvent[]): Promise<void>;
  deleteAccount(userId: string): Promise<void>;
  insertCheckoutSession(row: NewCheckoutSession): Promise<CheckoutSession>;
  getCheckoutSession(id: string): Promise<CheckoutSession | null>;
  getCheckoutSessionForProfile(id: string, profileId: string): Promise<CheckoutSession | null>;
  getCheckoutByBoxplusOrderId(orderId: string): Promise<CheckoutSession | null>;
  updateCheckoutSession(id: string, patch: CheckoutSessionPatch): Promise<void>;
  listInvoices(profileId: string, limit?: number): Promise<InvoiceRow[]>;
  insertInvoice(row: NewInvoiceRow): Promise<InvoiceRow>;
  upsertSubscription(profileId: string, patch: SubscriptionPatch): Promise<void>;
  insertShopEvent(row: NewShopEvent): Promise<boolean>;
  listShopEventsRecent(limit?: number): Promise<ShopEventRow[]>;
  listCheckoutAlerts(limit?: number): Promise<CheckoutSession[]>;
};

export type AuthUser = {
  id: string;
  email: string;
  emailConfirmed: boolean;
};

export type VerifyUser = (token: string) => Promise<AuthUser | null>;

type Row = Record<string, unknown>;

function fail(error: { message: string }, action: string): never {
  throw new Error(`${action}: ${error.message}`);
}

function isUnique(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  if (error.code === '23505') return true;
  return /profiles_deciplus_member_id_key|duplicate key/i.test(error.message ?? '');
}

function asText(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function asProfile(row: Row): Profile {
  const status = asText(row.link_status);
  return {
    id: String(row.id),
    prenom: asText(row.prenom) ?? '',
    nom: asText(row.nom) ?? '',
    email: asText(row.email) ?? '',
    telephone: asText(row.telephone) ?? '',
    date_naissance: asText(row.date_naissance)?.slice(0, 10) ?? null,
    club_principal: asText(row.club_principal),
    link_status: (status as LinkStatus | null) ?? 'en_attente',
    link_updated_at: asText(row.link_updated_at),
    deciplus_member_id: asText(row.deciplus_member_id),
    consentement_parental_requis: row.consentement_parental_requis === true,
  };
}

function asSnapshot(row: Row): Snapshot {
  const contrats = Array.isArray(row.contrats) ? row.contrats.filter((item): item is string => typeof item === 'string') : [];
  return {
    profile_id: String(row.profile_id),
    abonnement_actif: row.abonnement_actif === true,
    abonnement_en_attente: row.abonnement_en_attente === true,
    badge_enregistre: row.badge_enregistre === true,
    contrats,
    club: asText(row.club),
    read_at: asText(row.read_at) ?? new Date(0).toISOString(),
  };
}

function emailOf(value: unknown): string | null {
  if (Array.isArray(value)) return emailOf(value[0]);
  if (!value || typeof value !== 'object') return null;
  return asText((value as Row).email);
}

function asLinkRequest(row: Row): LinkRequest {
  const status = asText(row.status) ?? 'envoye';
  const resolution = asText(row.resolution);
  const fields = Array.isArray(row.mismatch_fields)
    ? row.mismatch_fields.filter((item): item is string => typeof item === 'string')
    : [];
  return {
    id: String(row.id),
    profile_id: String(row.profile_id),
    order_id: String(row.order_id),
    status: status as LinkRequest['status'],
    deciplus_member_id: asText(row.deciplus_member_id),
    mismatch_fields: fields,
    reason: asText(row.reason),
    resolution: resolution === 'lie' || resolution === 'refuse' ? resolution : null,
    resolved_by: asText(row.resolved_by),
    created_at: asText(row.created_at) ?? new Date(0).toISOString(),
    decided_at: asText(row.decided_at),
    resolved_at: asText(row.resolved_at),
  };
}

function asPassage(row: Row): MemberPassage {
  return {
    profile_id: String(row.profile_id),
    day: asText(row.day)?.slice(0, 10) ?? '',
    source: asText(row.source) ?? '',
    created_at: asText(row.created_at) ?? new Date(0).toISOString(),
  };
}

function asReview(row: Row): LinkRequestReview {
  const status = asText(row.status) ?? 'a_revoir';
  return {
    id: String(row.id),
    profile_id: String(row.profile_id),
    email: emailOf(row.profiles),
    status: status as LinkRequestReview['status'],
  };
}

function asCheckoutSession(row: Row): CheckoutSession {
  const status = asText(row.status) ?? 'opened';
  return {
    id: String(row.id),
    profile_id: String(row.profile_id),
    boxplus_order_id: asText(row.boxplus_order_id),
    offer_slug: asText(row.offer_slug) ?? '',
    club: asText(row.club) ?? '',
    payment_provider: asText(row.payment_provider),
    amount_cents: typeof row.amount_cents === 'number' ? row.amount_cents : 0,
    currency: asText(row.currency) ?? 'EUR',
    status: status as CheckoutSession['status'],
    deciplus_member_id: asText(row.deciplus_member_id),
    deciplus_sale_id: asText(row.deciplus_sale_id),
    error_code: asText(row.error_code),
    expires_at: asText(row.expires_at) ?? new Date(0).toISOString(),
    created_at: asText(row.created_at) ?? new Date(0).toISOString(),
    updated_at: asText(row.updated_at) ?? new Date(0).toISOString(),
  };
}

function asShopEventRow(row: Row): ShopEventRow {
  const payload = row.payload;
  return {
    event_id: asText(row.event_id) ?? '',
    type: asText(row.type) ?? '',
    order_id: asText(row.order_id),
    profile_id: asText(row.profile_id),
    status: asText(row.status) ?? 'recu',
    received_at: asText(row.received_at) ?? new Date(0).toISOString(),
    payload: payload && typeof payload === 'object' && !Array.isArray(payload) ? (payload as Record<string, unknown>) : {},
  };
}

function asInvoiceRow(row: Row): InvoiceRow {
  const status = asText(row.status) ?? 'paid';
  return {
    id: String(row.id),
    profile_id: String(row.profile_id),
    invoice_number: asText(row.invoice_number) ?? '',
    boxplus_order_id: asText(row.boxplus_order_id) ?? '',
    deciplus_sale_id: asText(row.deciplus_sale_id),
    club: asText(row.club) ?? '',
    label: asText(row.label) ?? '',
    amount_ht_cents: typeof row.amount_ht_cents === 'number' ? row.amount_ht_cents : 0,
    amount_tva_cents: typeof row.amount_tva_cents === 'number' ? row.amount_tva_cents : 0,
    amount_ttc_cents: typeof row.amount_ttc_cents === 'number' ? row.amount_ttc_cents : 0,
    status: status === 'refunded' || status === 'void' ? status : 'paid',
    issued_at: asText(row.issued_at) ?? new Date(0).toISOString(),
    storage_path: asText(row.storage_path) ?? '',
    sha256_hex: asText(row.sha256_hex) ?? '',
    created_at: asText(row.created_at) ?? new Date(0).toISOString(),
  };
}

function definedPatch(patch: object): Row {
  const out: Row = {};
  for (const [key, value] of Object.entries(patch)) {
    if (value !== undefined) out[key] = value;
  }
  return out;
}

export function createSupabaseStore(supabase: SupabaseClient): Store {
  return {
    async getProfile(id) {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', id).maybeSingle();
      if (error) fail(error, 'lecture profil');
      return data ? asProfile(data as Row) : null;
    },
    async updateProfile(id, patch) {
      const { error } = await supabase.from('profiles').update(definedPatch(patch)).eq('id', id);
      if (isUnique(error)) throw new FicheDejaLieeError();
      if (error) fail(error, 'mise a jour profil');
    },
    async getSnapshot(profileId) {
      const { data, error } = await supabase.from('deciplus_snapshots').select('*').eq('profile_id', profileId).maybeSingle();
      if (error) fail(error, 'lecture fiche');
      return data ? asSnapshot(data as Row) : null;
    },
    async upsertSnapshot(snapshot) {
      const { error } = await supabase.from('deciplus_snapshots').upsert(snapshot, { onConflict: 'profile_id' });
      if (error) fail(error, 'ecriture fiche');
    },
    async countLinkRequestsSince(profileId, sinceIso) {
      const { count, error } = await supabase
        .from('link_requests')
        .select('id', { count: 'exact', head: true })
        .eq('profile_id', profileId)
        .gte('created_at', sinceIso);
      if (error) fail(error, 'comptage demandes');
      return count ?? 0;
    },
    async hasInFlightReread(profileId, sinceIso) {
      const { data, error } = await supabase
        .from('link_requests')
        .select('id')
        .eq('profile_id', profileId)
        .eq('status', 'envoye')
        .gte('created_at', sinceIso)
        .limit(1);
      if (error) fail(error, 'lecture relecture');
      return (data?.length ?? 0) > 0;
    },
    async insertLinkRequest(row) {
      const { data, error } = await supabase
        .from('link_requests')
        .insert({
          profile_id: row.profile_id,
          order_id: row.order_id,
          status: row.status,
          deciplus_member_id: row.deciplus_member_id ?? null,
        })
        .select('*')
        .single();
      if (error) fail(error, 'creation demande');
      return asLinkRequest(data as Row);
    },
    async getLinkRequestByOrderId(orderId) {
      const { data, error } = await supabase.from('link_requests').select('*').eq('order_id', orderId).maybeSingle();
      if (error) fail(error, 'lecture demande');
      return data ? asLinkRequest(data as Row) : null;
    },
    async getLinkRequestById(id) {
      const { data, error } = await supabase.from('link_requests').select('*').eq('id', id).maybeSingle();
      if (error) fail(error, 'lecture demande');
      return data ? asLinkRequest(data as Row) : null;
    },
    async updateLinkRequest(id, patch) {
      const { error } = await supabase.from('link_requests').update(definedPatch(patch)).eq('id', id);
      if (error) fail(error, 'mise a jour demande');
    },
    async listLinkRequestsReview(limit = 40) {
      const { data, error } = await supabase
        .from('link_requests')
        .select('id, profile_id, status, profiles(email)')
        .eq('status', 'a_revoir')
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) fail(error, 'file a revoir');
      return (data ?? []).map((row) => asReview(row as Row));
    },
    async insertPassageIfNewDay(row) {
      const { error } = await supabase.from('member_passages').insert({
        profile_id: row.profile_id,
        day: row.day,
        source: row.source,
      });
      if (isUnique(error)) return false;
      if (error) fail(error, 'passage');
      return true;
    },
    async listPassages(profileId, limit = 2000) {
      const { data, error } = await supabase
        .from('member_passages')
        .select('profile_id, day, source, created_at')
        .eq('profile_id', profileId)
        .order('day', { ascending: false })
        .limit(limit);
      if (error) fail(error, 'lecture passages');
      return (data ?? []).map((row) => asPassage(row as Row));
    },
    async findOtherProfileByMemberId(memberId, exceptProfileId) {
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('deciplus_member_id', memberId)
        .neq('id', exceptProfileId)
        .limit(1);
      if (error) fail(error, 'lecture identifiant');
      return (data?.length ?? 0) > 0;
    },
    async insertAudit(entry) {
      const { error } = await supabase.from('audit_log').insert({
        actor: entry.actor,
        action: entry.action,
        target: entry.target,
        details: entry.details,
      });
      if (error) fail(error, 'journal');
    },
    async insertEvents(events) {
      if (events.length === 0) return;
      const { error } = await supabase.from('app_events').upsert(events, { onConflict: 'id', ignoreDuplicates: true });
      if (error) fail(error, 'evenements');
    },
    async insertCheckoutSession(row) {
      const { data, error } = await supabase
        .from('checkout_sessions')
        .insert({
          profile_id: row.profile_id,
          offer_slug: row.offer_slug,
          club: row.club,
          amount_cents: row.amount_cents ?? 0,
          expires_at: row.expires_at,
        })
        .select('*')
        .single();
      if (error) fail(error, 'creation checkout');
      return asCheckoutSession(data as Row);
    },
    async getCheckoutSession(id) {
      const { data, error } = await supabase.from('checkout_sessions').select('*').eq('id', id).maybeSingle();
      if (error) fail(error, 'lecture checkout');
      return data ? asCheckoutSession(data as Row) : null;
    },
    async getCheckoutSessionForProfile(id, profileId) {
      const { data, error } = await supabase.from('checkout_sessions').select('*').eq('id', id).eq('profile_id', profileId).maybeSingle();
      if (error) fail(error, 'lecture checkout');
      return data ? asCheckoutSession(data as Row) : null;
    },
    async getCheckoutByBoxplusOrderId(orderId) {
      const { data, error } = await supabase.from('checkout_sessions').select('*').eq('boxplus_order_id', orderId).maybeSingle();
      if (error) fail(error, 'lecture checkout commande');
      return data ? asCheckoutSession(data as Row) : null;
    },
    async updateCheckoutSession(id, patch) {
      const { error } = await supabase.from('checkout_sessions').update(definedPatch(patch)).eq('id', id);
      if (error) fail(error, 'mise a jour checkout');
    },
    async listInvoices(profileId, limit = 50) {
      const { data, error } = await supabase
        .from('invoices_index')
        .select('*')
        .eq('profile_id', profileId)
        .order('issued_at', { ascending: false })
        .limit(limit);
      if (error) fail(error, 'lecture factures');
      return (data ?? []).map((row) => asInvoiceRow(row as Row));
    },
    async insertInvoice(row) {
      const { data, error } = await supabase.from('invoices_index').insert(row).select('*').single();
      if (isUnique(error)) throw new Error('facture_doublon');
      if (error) fail(error, 'ecriture facture');
      return asInvoiceRow(data as Row);
    },
    async upsertSubscription(profileId, patch) {
      const { error } = await supabase.from('subscription_state').upsert({ profile_id: profileId, ...definedPatch(patch) }, { onConflict: 'profile_id' });
      if (error) fail(error, 'abonnement');
    },
    async insertShopEvent(row) {
      const { error } = await supabase.from('shop_events').insert({
        event_id: row.event_id,
        type: row.type,
        order_id: row.order_id ?? null,
        profile_id: row.profile_id ?? null,
        status: row.status ?? 'recu',
        payload: row.payload ?? {},
      });
      if (isUnique(error)) return false;
      if (error) fail(error, 'evenement boutique');
      return true;
    },
    async listShopEventsRecent(limit = 40) {
      const { data, error } = await supabase
        .from('shop_events')
        .select('event_id,type,order_id,profile_id,status,received_at,payload')
        .order('received_at', { ascending: false })
        .limit(limit);
      if (error) fail(error, 'lecture evenements boutique');
      return (data ?? []).map((row) => asShopEventRow(row as Row));
    },
    async listCheckoutAlerts(limit = 40) {
      const { data, error } = await supabase
        .from('checkout_sessions')
        .select('*')
        .in('status', ['manual_review', 'failed', 'paid_pending_deciplus', 'payment_pending'])
        .order('updated_at', { ascending: false })
        .limit(limit);
      if (error) fail(error, 'lecture checkouts');
      return (data ?? []).map((row) => asCheckoutSession(row as Row));
    },
    async deleteAccount(userId) {
      const { error } = await supabase.auth.admin.deleteUser(userId);
      if (error) fail(error, 'suppression compte');
    },
  };
}

export function createVerifier(supabase: SupabaseClient): VerifyUser {
  return async (token) => {
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user) return null;
    return {
      id: data.user.id,
      email: data.user.email ?? '',
      emailConfirmed: data.user.email_confirmed_at != null,
    };
  };
}

export function createSupabase(url: string, key: string): SupabaseClient {
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
