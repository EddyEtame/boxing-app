import { createHmac } from 'node:crypto';

export type ShopEventSummary = {
  eventId: string;
  type: string;
  orderId: string | null;
  status: string;
  receivedAt: string;
};

export type CheckoutAlertSummary = {
  id: string;
  status: string;
  profileId: string;
  offerSlug: string;
  club: string;
  boxplusOrderId: string | null;
  updatedAt: string;
  errorCode: string | null;
};

export type ShopHealthReport = {
  generatedAt: string;
  events: ShopEventSummary[];
  checkoutAlerts: CheckoutAlertSummary[];
};

export type LinkRequestReview = {
  id: string;
  profileId: string;
  email: string | null;
  status: string;
};

function bridgeBase(): string | null {
  const raw = process.env.MEMBER_BRIDGE_URL?.trim() || process.env.DECIPLUS_BRIDGE_URL?.trim() || '';
  return raw ? raw.replace(/\/+$/, '') : null;
}

function signBody(secret: string, timestamp: string, body: string): string {
  return createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex');
}

async function postSigned<T>(path: string): Promise<T | null> {
  const base = bridgeBase();
  const secret = process.env.ADMIN_BRIDGE_SECRET?.trim() || '';
  if (!base || !secret) return null;
  const body = '{}';
  const timestamp = String(Math.floor(Date.now() / 1000));
  const signature = signBody(secret, timestamp, body);
  try {
    const res = await fetch(`${base}${path}`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-bc-timestamp': timestamp,
        'x-bc-signature': signature,
      },
      body,
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export async function fetchLinkRequests(): Promise<LinkRequestReview[] | null> {
  const report = await postSigned<{ items?: LinkRequestReview[] }>('/internal/admin/link-requests');
  if (!report) return null;
  return Array.isArray(report.items) ? report.items : [];
}

export async function fetchShopHealth(): Promise<ShopHealthReport | null> {
  return postSigned<ShopHealthReport>('/internal/admin/shop-health');
}
