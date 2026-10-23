import { DIRECTION_ID, directionUser, listAccounts } from './accounts';
import { readAudit } from './audit';
import type { ClubId, Role } from '@/lib/types';

/**
 * Ce que la page « Comptes et droits » montre, prêt à afficher : le compte de
 * la boutique en tête (sans son adresse : l'écran est parfois partagé), puis
 * les comptes de l'équipe. Jamais une empreinte de mot de passe ni de lien.
 */
export type AccountStatus = 'actif' | 'invite' | 'expire' | 'suspendu';

export type AccountRow = {
  id: string;
  name: string;
  /** null pour le compte de la boutique. */
  email: string | null;
  role: Role;
  clubs: ClubId[] | 'all';
  signature: string;
  status: AccountStatus;
  isShop: boolean;
  hasPassword: boolean;
  activationExpiresAt?: string;
  lastLoginAt?: string;
  createdAt?: string;
  createdBy?: string;
  updatedAt?: string;
};

const STATUS_ORDER: Record<AccountStatus, number> = { actif: 0, invite: 1, expire: 2, suspendu: 3 };

export async function accountRows(): Promise<AccountRow[]> {
  const [accounts, journal] = await Promise.all([listAccounts(), readAudit()]);
  const names = new Map<string, string>([[DIRECTION_ID, 'Direction'], ...accounts.map((a) => [a.id, a.name] as [string, string])]);
  const now = Date.now();
  const rows: AccountRow[] = accounts.map((a) => {
    const expired = a.status === 'invite' && (!a.activation || Date.parse(a.activation.expiresAt) < now);
    return {
      id: a.id,
      name: a.name,
      email: a.email,
      role: a.role,
      clubs: a.clubs,
      signature: a.signature,
      status: expired ? 'expire' : a.status,
      isShop: false,
      hasPassword: Boolean(a.passwordHash),
      activationExpiresAt: a.activation?.expiresAt,
      lastLoginAt: a.lastLoginAt,
      createdAt: a.createdAt,
      createdBy: names.get(a.createdBy) ?? a.createdBy,
      updatedAt: a.updatedAt,
    };
  });
  rows.sort((x, y) => STATUS_ORDER[x.status] - STATUS_ORDER[y.status] || x.name.localeCompare(y.name, 'fr'));
  const shop = directionUser();
  if (shop) {
    const last = journal.find((e) => e.actor.id === DIRECTION_ID && e.action === 'connexion');
    rows.unshift({ id: DIRECTION_ID, name: shop.name, email: null, role: 'direction', clubs: 'all', signature: shop.signature, status: 'actif', isShop: true, hasPassword: true, lastLoginAt: last?.at });
  }
  return rows;
}
