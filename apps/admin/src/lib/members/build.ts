import { clubFromDeciplusGym, statutFor, type LinkStatus, type SubscriptionStatus } from '@bc/contract';

import type { LinkDecision, LinkQueueItem, Member, MembersOverview, MembersSource } from './types';
import { isClubId } from '@/lib/clubs';

/**
 * De la base à l'écran : les lignes telles que Supabase les rend (snake_case,
 * supabase/migrations/*.sql) deviennent les adhérents de l'admin. Pur, sans
 * lecture ni écriture : les tests le nourrissent de lignes fabriquées.
 */
export type ProfileRow = {
  id: string;
  prenom: string;
  nom: string;
  email: string;
  telephone: string;
  date_naissance: string | null;
  club_principal: string | null;
  link_status: string;
  link_updated_at: string | null;
  deciplus_member_id: string | null;
  consentement_parental_requis: boolean;
  created_at: string;
};

export type SnapshotRow = {
  profile_id: string;
  abonnement_actif: boolean;
  abonnement_en_attente: boolean;
  badge_enregistre: boolean;
  contrats: string[] | null;
  club: string | null;
  read_at: string;
};

export type SubscriptionRow = {
  profile_id: string;
  status: string;
  plan_label: string | null;
  next_charge_date: string | null;
  current_period_end: string | null;
  badge_active: boolean;
};

export type LinkRequestRow = {
  id: string;
  profile_id: string;
  order_id: string;
  status: string;
  deciplus_member_id: string | null;
  mismatch_fields: string[] | null;
  reason: string | null;
  resolution: string | null;
  resolved_by: string | null;
  created_at: string;
  decided_at: string | null;
  resolved_at: string | null;
};

export type MemberRows = { profiles: ProfileRow[]; snapshots: SnapshotRow[]; subscriptions: SubscriptionRow[]; requests: LinkRequestRow[] };

/** Les exemples locaux : les mêmes lignes, plus la date de leur chargement. */
export type DemoMembersState = MemberRows & { seededAt: string | null };

const LINKS: readonly LinkStatus[] = ['en_attente', 'lie', 'a_revoir', 'prospect'];
const SUBS: readonly SubscriptionStatus[] = ['none', 'activating', 'active', 'past_due', 'cancel_scheduled', 'ended', 'manual_review'];

const linkOf = (v: string): LinkStatus => (LINKS.includes(v as LinkStatus) ? (v as LinkStatus) : 'en_attente');
const subOf = (v: string): SubscriptionStatus => (SUBS.includes(v as SubscriptionStatus) ? (v as SubscriptionStatus) : 'none');
const text = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const ymd = (v: string | null) => (v && /^\d{4}-\d{2}-\d{2}/.test(v) ? v.slice(0, 10) : null);

export function toMember(p: ProfileRow, snap: SnapshotRow | undefined, sub: SubscriptionRow | undefined): Member {
  const snapshot = snap
    ? {
        abonnementActif: snap.abonnement_actif === true,
        abonnementEnAttente: snap.abonnement_en_attente === true,
        badgeEnregistre: snap.badge_enregistre === true,
        contrats: (snap.contrats ?? []).filter((c): c is string => typeof c === 'string').slice(0, 8),
        club: clubFromDeciplusGym(snap.club),
        readAt: snap.read_at,
      }
    : null;
  const link = linkOf(p.link_status);
  return {
    id: p.id,
    prenom: text(p.prenom, 60),
    nom: text(p.nom, 60),
    email: text(p.email, 120),
    telephone: text(p.telephone, 30),
    dateNaissance: ymd(p.date_naissance),
    clubPrincipal: isClubId(p.club_principal) ? p.club_principal : null,
    linkStatus: link,
    linkUpdatedAt: p.link_updated_at,
    deciplusMemberId: p.deciplus_member_id ? text(p.deciplus_member_id, 64) : null,
    parental: p.consentement_parental_requis === true,
    createdAt: p.created_at,
    snapshot,
    subscription: sub
      ? { status: subOf(sub.status), planLabel: sub.plan_label ? text(sub.plan_label, 120) : null, nextChargeDate: ymd(sub.next_charge_date), currentPeriodEnd: ymd(sub.current_period_end), badgeActive: sub.badge_active === true }
      : null,
    statut: statutFor(link, snapshot),
  };
}

/** Le nom complet tel que l'accueil le lit ; « Compte sans nom » si l'inscription n'a rien donné. */
export const memberName = (m: Pick<Member, 'prenom' | 'nom'>): string => [m.prenom, m.nom].filter(Boolean).join(' ');

export function buildOverview(rows: MemberRows, now = new Date(), source: MembersSource = 'supabase'): MembersOverview {
  const snapshots = new Map(rows.snapshots.map((s) => [s.profile_id, s]));
  const subscriptions = new Map(rows.subscriptions.map((s) => [s.profile_id, s]));
  const members = rows.profiles.map((p) => toMember(p, snapshots.get(p.id), subscriptions.get(p.id))).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const byId = new Map(members.map((m) => [m.id, m]));

  const byLink: Record<LinkStatus, number> = { en_attente: 0, lie: 0, a_revoir: 0, prospect: 0 };
  for (const m of members) byLink[m.linkStatus]++;
  const weekAgo = now.getTime() - 7 * 86_400_000;

  const item = (r: LinkRequestRow, member: Member): LinkQueueItem => ({
    id: r.id,
    orderId: r.order_id,
    createdAt: r.created_at,
    decidedAt: r.decided_at,
    deciplusMemberId: r.deciplus_member_id ? text(r.deciplus_member_id, 64) : null,
    mismatchFields: (r.mismatch_fields ?? []).filter((f): f is string => typeof f === 'string').slice(0, 20),
    reason: r.reason ? text(r.reason, 200) : null,
    member,
  });

  // La file : les demandes « à revoir » dont le compte existe encore, la plus ancienne en tête — c'est elle qui attend depuis le plus longtemps.
  const queue: LinkQueueItem[] = [];
  const decisions: LinkDecision[] = [];
  for (const r of rows.requests) {
    const member = byId.get(r.profile_id);
    if (!member) continue;
    if (r.status === 'a_revoir') queue.push(item(r, member));
    else if (r.status === 'resolu' && (r.resolution === 'lie' || r.resolution === 'refuse')) decisions.push({ ...item(r, member), resolution: r.resolution, resolvedBy: r.resolved_by, resolvedAt: r.resolved_at });
  }
  queue.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  decisions.sort((a, b) => (b.resolvedAt ?? '').localeCompare(a.resolvedAt ?? ''));

  return {
    source,
    seeded: source === 'supabase' || members.length > 0,
    readAt: now.toISOString(),
    total: members.length,
    byLink,
    actifs: members.filter((m) => m.statut === 'actif').length,
    recent: members.filter((m) => Date.parse(m.createdAt) >= weekAgo).length,
    queue,
    decisions: decisions.slice(0, 30),
    members,
  };
}

/** Ce qu'on cherche dans l'annuaire : le nom, le numéro de fiche, l'e-mail, le téléphone (chiffres seulement). */
export function memberHaystack(m: Member): string {
  const digits = m.telephone.replace(/\D/g, '');
  return [memberName(m), m.email, m.deciplusMemberId ?? '', digits, m.telephone].join(' ').toLocaleLowerCase('fr');
}
