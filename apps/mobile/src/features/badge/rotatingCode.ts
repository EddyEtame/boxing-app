import * as Crypto from 'expo-crypto';

/**
 * Code d’accès tournant, calculé sur l’appareil, sans réseau.
 *
 * Même principe que le TOTP (RFC 6238) : un secret lié à l’appareil, une fenêtre
 * de temps, un HMAC-SHA-256. Le lecteur (ou l’app staff) recalcule le même code
 * côté serveur pour la fenêtre courante et la précédente. Une capture d’écran
 * n’est donc utilisable que pendant la fenêtre où elle a été prise.
 *
 * Le secret ne quitte jamais l’appareil (SecureStore en production). Ici, pour la
 * maquette, il est fourni par l’appelant. La fenêtre est un paramètre : 30 s par
 * défaut, un round (180 s) dans la direction A.
 */

export const DEFAULT_WINDOW_SECONDS = 30;

const encoder = new TextEncoder();

function toBytes(s: string): Uint8Array {
  return encoder.encode(s);
}

function concat(a: Uint8Array, b: Uint8Array): Uint8Array {
  const out = new Uint8Array(a.length + b.length);
  out.set(a, 0);
  out.set(b, a.length);
  return out;
}

async function sha256(bytes: Uint8Array): Promise<Uint8Array> {
  const buf = await Crypto.digest(Crypto.CryptoDigestAlgorithm.SHA256, bytes as unknown as ArrayBuffer);
  return new Uint8Array(buf);
}

/** HMAC-SHA-256 composé à partir de deux digests (bloc de 64 octets). */
async function hmacSha256(key: Uint8Array, message: Uint8Array): Promise<Uint8Array> {
  const block = 64;
  let k = key;
  if (k.length > block) k = await sha256(k);
  const padded = new Uint8Array(block);
  padded.set(k);
  const ipad = new Uint8Array(block);
  const opad = new Uint8Array(block);
  for (let i = 0; i < block; i++) {
    ipad[i] = padded[i] ^ 0x36;
    opad[i] = padded[i] ^ 0x5c;
  }
  const inner = await sha256(concat(ipad, message));
  return sha256(concat(opad, inner));
}

export type RotatingCode = {
  /** Charge utile encodée dans le QR : identifiant membre, fenêtre, signature tronquée. */
  payload: string;
  /** Six chiffres lisibles, pour un pointage manuel au comptoir. */
  digits: string;
  /** Secondes restantes dans la fenêtre courante. */
  secondsLeft: number;
  window: number;
};

function toBase32(bytes: Uint8Array, length: number): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = 0;
  let value = 0;
  let out = '';
  for (const b of bytes) {
    value = (value << 8) | b;
    bits += 8;
    while (bits >= 5 && out.length < length) {
      out += alphabet[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
    if (out.length >= length) break;
  }
  return out;
}

export async function computeCode(memberId: string, deviceSecret: string, windowSeconds = DEFAULT_WINDOW_SECONDS, now = Date.now()): Promise<RotatingCode> {
  const s = Math.floor(now / 1000);
  const window = Math.floor(s / windowSeconds);
  const mac = await hmacSha256(toBytes(deviceSecret), toBytes(`${memberId}:${windowSeconds}:${window}`));
  // Troncature dynamique (RFC 4226) pour les six chiffres.
  const offset = mac[mac.length - 1] & 0x0f;
  const bin = ((mac[offset] & 0x7f) << 24) | (mac[offset + 1] << 16) | (mac[offset + 2] << 8) | mac[offset + 3];
  const digits = String(bin % 1_000_000).padStart(6, '0');
  const signature = toBase32(mac, 16);
  return {
    payload: `BC1.${memberId}.${window.toString(36).toUpperCase()}.${signature}`,
    digits,
    secondsLeft: windowSeconds - (s % windowSeconds),
    window,
  };
}
