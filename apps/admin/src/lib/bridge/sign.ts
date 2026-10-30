import { createHmac } from 'node:crypto';

/**
 * La signature des appels de l'admin au serveur applicatif (apps/bridge,
 * routes `/internal/admin/*`) : HMAC-SHA256 du `${horodatage}.${corps}` avec
 * ADMIN_BRIDGE_SECRET, l'horodatage en secondes, cinq minutes de tolérance
 * côté serveur (apps/bridge/src/signature.ts, verifyBridgeSignature).
 */
export const BRIDGE_HEADERS = { timestamp: 'x-bc-timestamp', signature: 'x-bc-signature' } as const;

export function signBridgeBody(secret: string, timestamp: string, body: string): string {
  return createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex');
}

export function signedHeaders(secret: string, body: string, now = Date.now()): Record<string, string> {
  const timestamp = String(Math.floor(now / 1000));
  return { 'content-type': 'application/json', [BRIDGE_HEADERS.timestamp]: timestamp, [BRIDGE_HEADERS.signature]: signBridgeBody(secret, timestamp, body) };
}

/** Les codes que le serveur renvoie à une décision, et ce que l'admin en fait. */
export type BridgeErrorCode = 'signature_invalide' | 'requete_invalide' | 'demande_inconnue' | 'profil_introuvable' | 'deja_resolue' | 'identifiant_manquant' | 'fiche_deja_liee' | 'robot_indisponible';

export function bridgeErrorOf(status: number, body: unknown): BridgeErrorCode | 'pont' {
  const code = body && typeof body === 'object' && typeof (body as { error?: unknown }).error === 'string' ? (body as { error: string }).error : '';
  const known: BridgeErrorCode[] = ['signature_invalide', 'requete_invalide', 'demande_inconnue', 'profil_introuvable', 'deja_resolue', 'identifiant_manquant', 'fiche_deja_liee', 'robot_indisponible'];
  if (known.includes(code as BridgeErrorCode)) return code as BridgeErrorCode;
  if (status === 401) return 'signature_invalide';
  if (status === 404) return 'demande_inconnue';
  if (status === 503) return 'robot_indisponible';
  return 'pont';
}
