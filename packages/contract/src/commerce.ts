import type { ClubId } from '@bc/brand';

export type CheckoutStatus =
  | 'opened'
  | 'payment_pending'
  | 'paid_pending_deciplus'
  | 'completed'
  | 'failed'
  | 'expired'
  | 'manual_review';

export type SubscriptionStatus =
  | 'none'
  | 'activating'
  | 'active'
  | 'past_due'
  | 'cancel_scheduled'
  | 'ended'
  | 'manual_review';

export type CheckoutSessionRequest = {
  offerSlug: string;
  club: ClubId;
};

export type CheckoutSessionResponse = {
  id: string;
  status: CheckoutStatus;
  checkoutUrl: string;
  expiresAt: string;
};

export type CheckoutSessionView = {
  id: string;
  status: CheckoutStatus;
  offerSlug: string;
  club: ClubId;
  boxplusOrderId: string | null;
  updatedAt: string;
  expiresAt: string;
};

export type InvoiceRef = {
  id: string;
  invoiceNumber: string;
  label: string;
  amountTtcCents: number;
  issuedAt: string;
  status: 'paid' | 'refunded' | 'void';
};

export type InvoicesResponse = {
  items: InvoiceRef[];
};

export type ShopEventType =
  | 'order.paid'
  | 'sale.done'
  | 'sale.failed'
  | 'cancel.done'
  | 'invoice.issued';
