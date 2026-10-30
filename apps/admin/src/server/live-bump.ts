import { createHmac } from 'node:crypto';

const COLLECTION_DOMAIN: Record<string, string> = {
  messagerie: 'comms.messages',
  notifications: 'comms.notifications',
  envois: 'comms.notifications',
  actualites: 'content.actualites',
  evenements: 'content.evenements',
  videos: 'content.videos',
  plannings: 'planning',
  propositions: 'moderation',
  regles: 'moderation',
  fonctions: 'config.features',
  demo: 'demo',
};

function bridgeBase(): string | null {
  const raw = process.env.MEMBER_BRIDGE_URL?.trim() || process.env.DECIPLUS_BRIDGE_URL?.trim() || '';
  return raw ? raw.replace(/\/+$/, '') : null;
}

function sign(secret: string, timestamp: string, body: string): string {
  return createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex');
}

/** Apres une ecriture locale, notifie le bus Realtime via le bridge (service role). */
export async function bumpLive(collection: string, action = 'updated', payload: Record<string, unknown> = {}): Promise<void> {
  const domain = COLLECTION_DOMAIN[collection] ?? `admin.${collection}`;
  const base = bridgeBase();
  const secret = process.env.ADMIN_BRIDGE_SECRET?.trim() || '';
  if (!base || !secret) return;
  const body = JSON.stringify({ domain, action, payload });
  const timestamp = String(Math.floor(Date.now() / 1000));
  const signature = sign(secret, timestamp, body);
  try {
    await fetch(`${base}/internal/admin/live-bump`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-bc-timestamp': timestamp,
        'x-bc-signature': signature,
      },
      body,
    });
  } catch {
    /* offline bridge : l'admin reste coherent localement */
  }
}
