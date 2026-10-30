import { newId } from './crypto';
import { pgInsertAudit } from './pg-collections';
import { readCollection, updateCollection } from './store';
import type { AuditEntry, SessionUser } from '@/lib/types';

/**
 * Le journal : qui a fait quoi, quand (architecture §4 « journal des accès
 * admin » ; RGPD : on sait qui a lu ou changé quoi). On garde les 5 000
 * dernières entrées ; les détails ne contiennent jamais de secret ni de
 * donnée de santé.
 */
const MAX = 5000;

export type Actor = Pick<SessionUser, 'id' | 'name' | 'role'> | { id: 'systeme'; name: string; role: 'systeme' };

export async function audit(actor: Actor, action: string, target?: string, detail?: string): Promise<void> {
  const entry: AuditEntry = {
    id: newId('j'),
    at: new Date().toISOString(),
    actor: { id: actor.id, name: actor.name, role: actor.role },
    action,
    target,
    detail: detail?.slice(0, 280),
  };
  await updateCollection<AuditEntry[], void>('journal', () => [], (list) => ({ next: [entry, ...list].slice(0, MAX), result: undefined }));
  await pgInsertAudit({ actorId: entry.actor.id, name: entry.actor.name, role: entry.actor.role, action: entry.action, target: entry.target, detail: entry.detail });
}

export async function readAudit(): Promise<AuditEntry[]> {
  return readCollection<AuditEntry[]>('journal', () => []);
}
