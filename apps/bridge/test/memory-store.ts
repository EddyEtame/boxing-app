import { randomUUID } from 'node:crypto';

import {
  FicheDejaLieeError,
  type AuditEntry,
  type CheckoutSession,
  type CheckoutSessionPatch,
  type InvoiceRow,
  type LinkRequest,
  type LinkRequestPatch,
  type NewCheckoutSession,
  type NewInvoiceRow,
  type NewLinkRequest,
  type NewShopEvent,
  type Profile,
  type ProfilePatch,
  type Snapshot,
  type Store,
  type StoredEvent,
  type SubscriptionPatch,
} from '../src/store.ts';

export class MemoryStore implements Store {
  readonly profiles = new Map<string, Profile>();
  readonly snapshots = new Map<string, Snapshot>();
  readonly requests: LinkRequest[] = [];
  readonly audits: AuditEntry[] = [];
  readonly events: StoredEvent[] = [];
  readonly checkouts: CheckoutSession[] = [];
  readonly invoices: InvoiceRow[] = [];
  readonly shopEvents = new Set<string>();
  readonly subscriptions = new Map<string, Record<string, unknown>>();
  readonly deleted: string[] = [];
  private readonly now: () => Date;

  constructor(now: () => Date = () => new Date()) {
    this.now = now;
  }

  async getProfile(id: string): Promise<Profile | null> {
    return this.profiles.get(id) ?? null;
  }

  async updateProfile(id: string, patch: ProfilePatch): Promise<void> {
    const current = this.profiles.get(id);
    if (!current) throw new Error('profil introuvable');
    if (patch.deciplus_member_id) {
      const taken = await this.findOtherProfileByMemberId(patch.deciplus_member_id, id);
      if (taken) throw new FicheDejaLieeError();
    }
    Object.assign(current, patch);
  }

  async getSnapshot(profileId: string): Promise<Snapshot | null> {
    return this.snapshots.get(profileId) ?? null;
  }

  async upsertSnapshot(snapshot: Snapshot): Promise<void> {
    this.snapshots.set(snapshot.profile_id, { ...snapshot, contrats: [...snapshot.contrats] });
  }

  async countLinkRequestsSince(profileId: string, sinceIso: string): Promise<number> {
    return this.requests.filter((row) => row.profile_id === profileId && row.created_at >= sinceIso).length;
  }

  async hasInFlightReread(profileId: string, sinceIso: string): Promise<boolean> {
    return this.requests.some((row) => row.profile_id === profileId && row.status === 'envoye' && row.created_at >= sinceIso);
  }

  async insertLinkRequest(row: NewLinkRequest): Promise<LinkRequest> {
    const created: LinkRequest = {
      id: randomUUID(),
      profile_id: row.profile_id,
      order_id: row.order_id,
      status: row.status,
      deciplus_member_id: row.deciplus_member_id ?? null,
      mismatch_fields: [],
      reason: null,
      resolution: null,
      resolved_by: null,
      created_at: this.now().toISOString(),
      decided_at: null,
      resolved_at: null,
    };
    this.requests.push(created);
    return created;
  }

  seedRequest(row: Pick<LinkRequest, 'profile_id' | 'order_id'> & Partial<LinkRequest>): LinkRequest {
    const created: LinkRequest = {
      id: row.id ?? randomUUID(),
      profile_id: row.profile_id,
      order_id: row.order_id,
      status: row.status ?? 'envoye',
      deciplus_member_id: row.deciplus_member_id ?? null,
      mismatch_fields: row.mismatch_fields ?? [],
      reason: row.reason ?? null,
      resolution: row.resolution ?? null,
      resolved_by: row.resolved_by ?? null,
      created_at: row.created_at ?? this.now().toISOString(),
      decided_at: row.decided_at ?? null,
      resolved_at: row.resolved_at ?? null,
    };
    this.requests.push(created);
    return created;
  }

  async getLinkRequestByOrderId(orderId: string): Promise<LinkRequest | null> {
    return this.requests.find((row) => row.order_id === orderId) ?? null;
  }

  async getLinkRequestById(id: string): Promise<LinkRequest | null> {
    return this.requests.find((row) => row.id === id) ?? null;
  }

  async updateLinkRequest(id: string, patch: LinkRequestPatch): Promise<void> {
    const current = this.requests.find((row) => row.id === id);
    if (!current) throw new Error('demande introuvable');
    Object.assign(current, patch);
  }

  async findOtherProfileByMemberId(memberId: string, exceptProfileId: string): Promise<boolean> {
    for (const profile of this.profiles.values()) {
      if (profile.id !== exceptProfileId && profile.deciplus_member_id === memberId) return true;
    }
    return false;
  }

  async insertAudit(entry: AuditEntry): Promise<void> {
    this.audits.push(entry);
  }

  async insertEvents(events: StoredEvent[]): Promise<void> {
    const known = new Set(this.events.map((event) => event.id));
    for (const event of events) {
      if (known.has(event.id)) continue;
      known.add(event.id);
      this.events.push(event);
    }
  }

  async insertCheckoutSession(row: NewCheckoutSession): Promise<CheckoutSession> {
    const nowIso = this.now().toISOString();
    const created: CheckoutSession = {
      id: randomUUID(),
      profile_id: row.profile_id,
      boxplus_order_id: null,
      offer_slug: row.offer_slug,
      club: row.club,
      payment_provider: null,
      amount_cents: row.amount_cents ?? 0,
      currency: 'EUR',
      status: 'opened',
      deciplus_member_id: null,
      deciplus_sale_id: null,
      error_code: null,
      expires_at: row.expires_at,
      created_at: nowIso,
      updated_at: nowIso,
    };
    this.checkouts.push(created);
    return created;
  }

  async getCheckoutSession(id: string): Promise<CheckoutSession | null> {
    return this.checkouts.find((row) => row.id === id) ?? null;
  }

  async getCheckoutSessionForProfile(id: string, profileId: string): Promise<CheckoutSession | null> {
    const row = this.checkouts.find((item) => item.id === id && item.profile_id === profileId);
    return row ?? null;
  }

  async getCheckoutByBoxplusOrderId(orderId: string): Promise<CheckoutSession | null> {
    return this.checkouts.find((row) => row.boxplus_order_id === orderId) ?? null;
  }

  async updateCheckoutSession(id: string, patch: CheckoutSessionPatch): Promise<void> {
    const current = this.checkouts.find((row) => row.id === id);
    if (!current) throw new Error('checkout introuvable');
    Object.assign(current, patch, { updated_at: this.now().toISOString() });
  }

  async listInvoices(profileId: string, limit = 50): Promise<InvoiceRow[]> {
    return this.invoices.filter((row) => row.profile_id === profileId).slice(0, limit);
  }

  async insertInvoice(row: NewInvoiceRow): Promise<InvoiceRow> {
    if (this.invoices.some((item) => item.invoice_number === row.invoice_number)) {
      throw new Error('facture_doublon');
    }
    const created: InvoiceRow = { ...row, id: randomUUID(), created_at: this.now().toISOString() };
    this.invoices.push(created);
    return created;
  }

  async upsertSubscription(profileId: string, patch: SubscriptionPatch): Promise<void> {
    const current = this.subscriptions.get(profileId) ?? { profile_id: profileId };
    this.subscriptions.set(profileId, { ...current, ...patch, updated_at: this.now().toISOString() });
  }

  async insertShopEvent(row: NewShopEvent): Promise<boolean> {
    if (this.shopEvents.has(row.event_id)) return false;
    this.shopEvents.add(row.event_id);
    return true;
  }

  async deleteAccount(userId: string): Promise<void> {
    this.deleted.push(userId);
    this.profiles.delete(userId);
    this.snapshots.delete(userId);
  }
}
