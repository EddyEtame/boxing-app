import { recordDailyPassage } from './passages.ts';
import type { ParsedShopEvent } from './shop-in.ts';
import type { CheckoutSession, Profile, Store } from './store.ts';

export async function applyShopEvent(store: Store, event: ParsedShopEvent, now: Date): Promise<{ ok: true } | { ok: false; reason: string }> {
  const inserted = await store.insertShopEvent({
    event_id: event.event_id,
    type: event.type,
    order_id: event.order_id,
    payload: event as unknown as Record<string, unknown>,
  });
  if (!inserted) return { ok: true };

  let session: CheckoutSession | null = null;
  if (event.checkout_session_id) {
    session = await store.getCheckoutSession(event.checkout_session_id);
  }
  if (!session && event.boxplus_order_id) {
    session = await store.getCheckoutByBoxplusOrderId(event.boxplus_order_id);
  }

  switch (event.type) {
    case 'order.paid':
      if (!session) return { ok: false, reason: 'checkout_introuvable' };
      await store.updateCheckoutSession(session.id, {
        status: 'paid_pending_deciplus',
        boxplus_order_id: event.boxplus_order_id ?? event.order_id,
        payment_provider: 'payplug',
        amount_cents: event.amount_ttc_cents ?? session.amount_cents,
      });
      await store.upsertSubscription(session.profile_id, {
        status: 'activating',
        club: session.club,
        last_order_id: event.boxplus_order_id ?? event.order_id,
      });
      return { ok: true };
    case 'sale.done':
      if (!session) return { ok: false, reason: 'checkout_introuvable' };
      await store.updateCheckoutSession(session.id, {
        status: 'completed',
        deciplus_sale_id: event.deciplus_sale_id,
      });
      await store.upsertSubscription(session.profile_id, {
        status: 'active',
        badge_active: true,
        last_order_id: event.boxplus_order_id ?? event.order_id,
        last_deciplus_sync_at: now.toISOString(),
      });
      await recordDailyPassage(store, session.profile_id, now, 'shop');
      return { ok: true };
    case 'sale.failed':
      if (!session) return { ok: false, reason: 'checkout_introuvable' };
      await store.updateCheckoutSession(session.id, { status: 'failed', error_code: event.error_code ?? 'deciplus_echec' });
      await store.upsertSubscription(session.profile_id, { status: 'manual_review' });
      return { ok: true };
    case 'invoice.issued':
      if (!session) return { ok: false, reason: 'checkout_introuvable' };
      if (!event.invoice_number || !event.storage_path || !event.sha256_hex || event.amount_ttc_cents == null) {
        return { ok: false, reason: 'facture_incomplete' };
      }
      try {
        await store.insertInvoice({
          profile_id: session.profile_id,
          invoice_number: event.invoice_number,
          boxplus_order_id: event.boxplus_order_id ?? event.order_id ?? session.boxplus_order_id ?? session.id,
          deciplus_sale_id: event.deciplus_sale_id,
          club: event.club ?? session.club,
          label: event.label ?? 'Facture Boxing Center',
          amount_ht_cents: Math.floor(event.amount_ttc_cents / 1.2),
          amount_tva_cents: event.amount_ttc_cents - Math.floor(event.amount_ttc_cents / 1.2),
          amount_ttc_cents: event.amount_ttc_cents,
          status: 'paid',
          issued_at: now.toISOString(),
          storage_path: event.storage_path,
          sha256_hex: event.sha256_hex,
        });
      } catch (err) {
        if (err instanceof Error && err.message === 'facture_doublon') return { ok: true };
        throw err;
      }
      return { ok: true };
    case 'cancel.done':
      if (session) {
        await store.updateCheckoutSession(session.id, { status: 'failed', error_code: 'annule' });
        await store.upsertSubscription(session.profile_id, { status: 'ended' });
      }
      return { ok: true };
    default:
      return { ok: false, reason: 'type_inconnu' };
  }
}

export function profileReadyForCheckout(profile: Profile): boolean {
  return Boolean(profile.prenom && profile.nom && profile.email && profile.date_naissance && profile.club_principal);
}
