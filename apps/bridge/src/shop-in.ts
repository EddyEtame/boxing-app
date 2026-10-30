import type { ShopEventType } from '@bc/contract';

export const SHOP_EVENT_TYPES = new Set<ShopEventType>([
  'order.paid',
  'sale.done',
  'sale.failed',
  'cancel.done',
  'invoice.issued',
]);

export function parseShopEventType(value: unknown): ShopEventType | null {
  if (typeof value !== 'string') return null;
  return SHOP_EVENT_TYPES.has(value as ShopEventType) ? (value as ShopEventType) : null;
}

export type ParsedShopEvent = {
  event_id: string;
  type: ShopEventType;
  order_id: string | null;
  checkout_session_id: string | null;
  boxplus_order_id: string | null;
  invoice_number: string | null;
  amount_ttc_cents: number | null;
  label: string | null;
  club: string | null;
  storage_path: string | null;
  sha256_hex: string | null;
  deciplus_sale_id: string | null;
  error_code: string | null;
};

export function parseShopEventBody(body: unknown): ParsedShopEvent | null {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return null;
  const row = body as Record<string, unknown>;
  const eventId = typeof row.event_id === 'string' ? row.event_id.trim().slice(0, 120) : '';
  const type = parseShopEventType(row.type);
  if (!eventId || !type) return null;
  const text = (key: string, max: number): string | null => {
    const v = row[key];
    if (typeof v !== 'string') return null;
    const t = v.trim();
    return t ? t.slice(0, max) : null;
  };
  const cents = typeof row.amount_ttc_cents === 'number' && Number.isFinite(row.amount_ttc_cents) ? Math.max(0, Math.floor(row.amount_ttc_cents)) : null;
  return {
    event_id: eventId,
    type,
    order_id: text('order_id', 80),
    checkout_session_id: text('checkout_session_id', 80),
    boxplus_order_id: text('boxplus_order_id', 80),
    invoice_number: text('invoice_number', 80),
    amount_ttc_cents: cents,
    label: text('label', 200),
    club: text('club', 40),
    storage_path: text('storage_path', 500),
    sha256_hex: text('sha256_hex', 128),
    deciplus_sale_id: text('deciplus_sale_id', 80),
    error_code: text('error_code', 120),
  };
}
