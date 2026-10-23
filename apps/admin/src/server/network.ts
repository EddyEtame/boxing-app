import { networkInterfaces } from 'node:os';

/** Les adresses IPv4 de cette machine sur le réseau local : ce qu'un téléphone doit viser pour joindre l'admin. */
export function lanAddresses(): string[] {
  const out: string[] = [];
  for (const list of Object.values(networkInterfaces())) {
    for (const a of list ?? []) {
      if (a.family === 'IPv4' && !a.internal && /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(a.address)) out.push(a.address);
    }
  }
  return [...new Set(out)];
}

export function adminPort(): number {
  const p = Number(process.env.PORT);
  return Number.isInteger(p) && p > 0 ? p : 3001;
}
