import type { CheckoutStatus, ShopEventType } from '@bc/contract';

export type CheckoutSession = {
  id: string;
  profile_id: string;
  boxplus_order_id: string | null;
  offer_slug: string;
  club: string;
  payment_provider: string | null;
  amount_cents: number;
  currency: string;
  status: CheckoutStatus;
  deciplus_member_id: string | null;
  deciplus_sale_id: string | null;
  error_code: string | null;
  expires_at: string;
  created_at: string;
  updated_at: string;
};

export type NewCheckoutSession = {
  profile_id: string;
  offer_slug: string;
  club: string;
  amount_cents?: number;
  expires_at: string;
};

export type CheckoutSessionPatch = {
  boxplus_order_id?: string | null;
  payment_provider?: string | null;
  amount_cents?: number;
  status?: CheckoutStatus;
  deciplus_member_id?: string | null;
  deciplus_sale_id?: string | null;
  error_code?: string | null;
};

export type InvoiceRow = {
  id: string;
  profile_id: string;
  invoice_number: string;
  boxplus_order_id: string;
  deciplus_sale_id: string | null;
  club: string;
  label: string;
  amount_ht_cents: number;
  amount_tva_cents: number;
  amount_ttc_cents: number;
  status: 'paid' | 'refunded' | 'void';
  issued_at: string;
  storage_path: string;
  sha256_hex: string;
  created_at: string;
};

export type NewInvoiceRow = Omit<InvoiceRow, 'id' | 'created_at'>;

export type SubscriptionPatch = {
  deciplus_member_id?: string | null;
  club?: string | null;
  status?: string;
  plan_code?: string | null;
  plan_label?: string | null;
  billing_mode?: string | null;
  badge_active?: boolean;
  last_order_id?: string | null;
  last_deciplus_sync_at?: string | null;
};

export type NewShopEvent = {
  event_id: string;
  type: ShopEventType;
  order_id?: string | null;
  profile_id?: string | null;
  status?: string;
  payload?: Record<string, unknown>;
};

export type ShopEventRow = {
  event_id: string;
  type: string;
  order_id: string | null;
  profile_id: string | null;
  status: string;
  received_at: string;
  payload: Record<string, unknown>;
};
