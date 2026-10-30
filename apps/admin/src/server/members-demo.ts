import { audit } from './audit';
import { read, update } from './collections';
import type { DemoMembersState, LinkRequestRow, MemberRows, ProfileRow, SnapshotRow, SubscriptionRow } from '@/lib/members/build';
import type { DecisionError } from '@/lib/members/types';
import type { ClubId, SessionUser } from '@/lib/types';

/**
 * LES EXEMPLES — des comptes inventés, dans les formes exactes de la base de
 * l'app (supabase/migrations), pour voir la rubrique Adhérents à l'œuvre tant
 * que la base n'est pas branchée. Les décisions prises sur eux s'écrivent dans
 * le même fichier local : le parcours entier se joue, sans toucher personne.
 */
export const EMPTY_DEMO = (): DemoMembersState => ({ profiles: [], snapshots: [], subscriptions: [], requests: [], seededAt: null });

const daysAgo = (now: Date, days: number, hour = 10) => new Date(now.getTime() - days * 86_400_000 - (hour - 10) * 3_600_000).toISOString();

type Seed = {
  id: string;
  prenom: string;
  nom: string;
  email: string;
  tel: string;
  naissance: string | null;
  club: ClubId | null;
  link: ProfileRow['link_status'];
  member?: string;
  created: number;
  parental?: boolean;
  fiche?: Partial<SnapshotRow>;
  sub?: Partial<SubscriptionRow>;
  request?: Partial<LinkRequestRow> & { ago: number };
};

/** Quatorze comptes plausibles : six liés, un abonnement en attente, deux en attente du robot, deux prospects, trois à revoir ; deux décisions déjà prises. */
const SEEDS: Seed[] = [
  { id: 'p01', prenom: 'Yanis', nom: 'Benali', email: 'yanis.benali@example.org', tel: '06 11 22 33 44', naissance: '2001-04-12', club: 'minimes', link: 'lie', member: '48213', created: 26, fiche: { contrats: ['Illimité 12 mois'], club: 'minimes' }, sub: { status: 'active', plan_label: 'Illimité 12 mois', next_charge_date: '+12', badge_active: true } },
  { id: 'p02', prenom: 'Inès', nom: 'Delmas', email: 'ines.delmas@example.org', tel: '06 22 33 44 55', naissance: '1995-09-03', club: 'saint-cyprien', link: 'lie', member: '47102', created: 25, fiche: { contrats: ['Carte 10 séances'], club: 'st-cyprien' } },
  { id: 'p03', prenom: 'Karim', nom: 'Haddad', email: 'karim.haddad@example.org', tel: '07 33 44 55 66', naissance: '1988-01-27', club: 'etats-unis', link: 'lie', member: '45311', created: 22, fiche: { contrats: ['Illimité 12 mois', 'Cours enfants'], club: 'etats-unis' }, sub: { status: 'past_due', plan_label: 'Illimité 12 mois', next_charge_date: '-3', badge_active: true } },
  { id: 'p04', prenom: 'Lucas', nom: 'Moreau', email: 'lucas.moreau@example.org', tel: '06 44 55 66 77', naissance: '2008-06-15', club: 'ramonville', link: 'lie', member: '48590', created: 20, fiche: { contrats: ['Boxe éducative'], club: 'ramonville' } },
  { id: 'p05', prenom: 'Mehdi', nom: 'Oulad', email: 'mehdi.oulad@example.org', tel: '06 55 66 77 88', naissance: '1992-11-30', club: 'portet', link: 'lie', member: '46044', created: 18, fiche: { contrats: ['Illimité 6 mois'], club: 'portet' }, sub: { status: 'cancel_scheduled', plan_label: 'Illimité 6 mois', current_period_end: '+40', badge_active: true } },
  { id: 'p06', prenom: 'Sarah', nom: 'Lopez', email: 'sarah.lopez@example.org', tel: '06 66 77 88 99', naissance: '1999-02-08', club: 'minimes', link: 'lie', member: '48233', created: 15, fiche: { contrats: ['Lady Punch'], club: 'minimes' } },
  { id: 'p07', prenom: 'Thomas', nom: 'Garcia', email: 'thomas.garcia@example.org', tel: '07 77 88 99 00', naissance: '1990-07-21', club: 'saint-cyprien', link: 'lie', member: '47155', created: 12, fiche: { abonnement_actif: false, abonnement_en_attente: true, contrats: [], club: 'st-cyprien' }, sub: { status: 'activating', plan_label: 'Illimité 12 mois', badge_active: false } },
  { id: 'p08', prenom: 'Nora', nom: 'Petit', email: 'nora.petit@example.org', tel: '06 88 99 00 11', naissance: '2003-12-02', club: 'portet', link: 'en_attente', created: 1 },
  { id: 'p09', prenom: 'Adam', nom: 'Roux', email: 'adam.roux@example.org', tel: '06 99 00 11 22', naissance: '1997-05-19', club: null, link: 'en_attente', created: 0 },
  { id: 'p10', prenom: 'Léa', nom: 'Fontaine', email: 'lea.fontaine@example.org', tel: '06 10 20 30 40', naissance: '1994-08-14', club: 'etats-unis', link: 'prospect', created: 9, request: { ago: 9, status: 'prospect', reason: 'aucune_fiche', deciplus_member_id: null, mismatch_fields: [] } },
  { id: 'p11', prenom: 'Hugo', nom: 'Martin', email: 'hugo.martin@example.org', tel: '06 20 30 40 50', naissance: '2012-03-09', club: 'ramonville', link: 'prospect', created: 6, parental: true, request: { ago: 6, status: 'prospect', reason: 'aucune_fiche', deciplus_member_id: null, mismatch_fields: [] } },
  { id: 'p12', prenom: 'Samia', nom: 'Khelifi', email: 'samia.khelifi@example.org', tel: '06 30 40 50 60', naissance: '1986-10-25', club: 'minimes', link: 'a_revoir', created: 3, request: { ago: 3, deciplus_member_id: '44870', mismatch_fields: ['telephone'] } },
  { id: 'p13', prenom: 'Julien', nom: 'Bernard', email: 'julien.bernard@example.org', tel: '07 40 50 60 70', naissance: '1991-01-05', club: 'saint-cyprien', link: 'a_revoir', created: 2, request: { ago: 2, deciplus_member_id: '47009', mismatch_fields: ['date_naissance', 'nom'] } },
  { id: 'p14', prenom: 'Camille', nom: 'Nguyen', email: 'camille.nguyen@example.org', tel: '06 50 60 70 80', naissance: '2000-09-17', club: 'portet', link: 'a_revoir', created: 1, request: { ago: 1, deciplus_member_id: null, mismatch_fields: [], reason: 'plusieurs_fiches' } },
];

/** Deux décisions déjà prises, pour que l'historique ne soit pas vide. */
const DECIDED: (Partial<LinkRequestRow> & { profile: string; ago: number })[] = [
  { profile: 'p06', ago: 14, status: 'resolu', resolution: 'lie', deciplus_member_id: '48233', mismatch_fields: ['telephone'], resolved_by: 'Accueil · Minimes' },
  { profile: 'p10', ago: 11, status: 'resolu', resolution: 'refuse', deciplus_member_id: '45555', mismatch_fields: ['date_naissance', 'email'], resolved_by: 'Direction' },
];

const dateFrom = (now: Date, spec: string | null | undefined): string | null => {
  if (!spec) return null;
  const m = /^([+-])(\d+)$/.exec(spec);
  if (!m) return spec;
  const d = new Date(now.getTime() + (m[1] === '-' ? -1 : 1) * Number(m[2]) * 86_400_000);
  return d.toISOString().slice(0, 10);
};

export function demoRows(now = new Date()): MemberRows {
  const profiles: ProfileRow[] = [];
  const snapshots: SnapshotRow[] = [];
  const subscriptions: SubscriptionRow[] = [];
  const requests: LinkRequestRow[] = [];
  for (const s of SEEDS) {
    const created = daysAgo(now, s.created, 9 + (s.id.charCodeAt(2) % 9));
    profiles.push({
      id: `demo-${s.id}`,
      prenom: s.prenom,
      nom: s.nom,
      email: s.email,
      telephone: s.tel,
      date_naissance: s.naissance,
      club_principal: s.club,
      link_status: s.link,
      link_updated_at: s.link === 'en_attente' ? null : daysAgo(now, Math.max(0, s.created - 1), 11),
      deciplus_member_id: s.link === 'lie' ? (s.member ?? null) : null,
      consentement_parental_requis: s.parental === true,
      created_at: created,
    });
    if (s.link === 'lie') {
      snapshots.push({ profile_id: `demo-${s.id}`, abonnement_actif: s.fiche?.abonnement_actif ?? true, abonnement_en_attente: s.fiche?.abonnement_en_attente ?? false, badge_enregistre: s.fiche?.badge_enregistre ?? true, contrats: s.fiche?.contrats ?? [], club: s.fiche?.club ?? null, read_at: daysAgo(now, 0, 7) });
    }
    if (s.sub) subscriptions.push({ profile_id: `demo-${s.id}`, status: s.sub.status ?? 'none', plan_label: s.sub.plan_label ?? null, next_charge_date: dateFrom(now, s.sub.next_charge_date), current_period_end: dateFrom(now, s.sub.current_period_end), badge_active: s.sub.badge_active ?? false });
    if (s.request) {
      const { ago, ...r } = s.request;
      requests.push({ id: `demo-r-${s.id}`, profile_id: `demo-${s.id}`, order_id: `demo-ord-${s.id}`, status: r.status ?? 'a_revoir', deciplus_member_id: r.deciplus_member_id ?? null, mismatch_fields: r.mismatch_fields ?? [], reason: r.reason ?? null, resolution: null, resolved_by: null, created_at: daysAgo(now, ago, 12), decided_at: daysAgo(now, ago, 12), resolved_at: null });
    }
  }
  DECIDED.forEach((d, i) => {
    requests.push({ id: `demo-rd-${i + 1}`, profile_id: `demo-${d.profile}`, order_id: `demo-ord-d${i + 1}`, status: 'resolu', deciplus_member_id: d.deciplus_member_id ?? null, mismatch_fields: d.mismatch_fields ?? [], reason: null, resolution: d.resolution ?? 'lie', resolved_by: d.resolved_by ?? null, created_at: daysAgo(now, d.ago, 12), decided_at: daysAgo(now, d.ago, 12), resolved_at: daysAgo(now, d.ago - 1, 15) });
  });
  return { profiles, snapshots, subscriptions, requests };
}

export async function readDemoMembers(): Promise<DemoMembersState> {
  return read('adherents');
}

export async function seedMembersDemo(user: SessionUser): Promise<number> {
  const rows = demoRows();
  await update('adherents', () => ({ next: { ...rows, seededAt: new Date().toISOString() }, result: undefined }));
  await audit(user, 'adherent.demo', 'adherents', `${rows.profiles.length} comptes d’exemple`);
  return rows.profiles.length;
}

export async function purgeMembersDemo(user: SessionUser): Promise<void> {
  await update('adherents', () => ({ next: EMPTY_DEMO(), result: undefined }));
  await audit(user, 'adherent.demo.retrait', 'adherents');
}

/** La même décision que le serveur applicatif, jouée sur les exemples : lier écrit la fiche, refuser laisse prospect. */
type DemoOutcome = { ok: true; status: 'lie' | 'prospect' } | { ok: false; code: DecisionError };

export async function resolveDemo(user: SessionUser, requestId: string, resolution: 'lie' | 'refuse'): Promise<DemoOutcome> {
  const nowIso = new Date().toISOString();
  const out = await update<'adherents', DemoOutcome>('adherents', (st) => {
    const request = st.requests.find((r) => r.id === requestId);
    if (!request) return { next: st, result: { ok: false, code: 'introuvable' } as const };
    if (request.status === 'resolu') return { next: st, result: { ok: false, code: 'deja_resolue' } as const };
    const profile = st.profiles.find((p) => p.id === request.profile_id);
    if (!profile) return { next: st, result: { ok: false, code: 'introuvable' } as const };
    if (resolution === 'lie') {
      const memberId = request.deciplus_member_id;
      if (!memberId) return { next: st, result: { ok: false, code: 'identifiant_manquant' } as const };
      if (st.profiles.some((p) => p.id !== profile.id && p.deciplus_member_id === memberId)) return { next: st, result: { ok: false, code: 'fiche_deja_liee' } as const };
      const snapshot: SnapshotRow = { profile_id: profile.id, abonnement_actif: true, abonnement_en_attente: false, badge_enregistre: true, contrats: ['Illimité 12 mois'], club: profile.club_principal, read_at: nowIso };
      const next: DemoMembersState = {
        ...st,
        profiles: st.profiles.map((p) => (p.id === profile.id ? { ...p, link_status: 'lie', link_updated_at: nowIso, deciplus_member_id: memberId } : p)),
        snapshots: [...st.snapshots.filter((s) => s.profile_id !== profile.id), snapshot],
        requests: st.requests.map((r) => (r.id === requestId ? { ...r, status: 'resolu', resolution: 'lie', resolved_by: user.name, resolved_at: nowIso } : r)),
      };
      return { next, result: { ok: true, status: 'lie' } as const };
    }
    const next: DemoMembersState = {
      ...st,
      profiles: st.profiles.map((p) => (p.id === profile.id ? { ...p, link_status: 'prospect', link_updated_at: nowIso, deciplus_member_id: null } : p)),
      requests: st.requests.map((r) => (r.id === requestId ? { ...r, status: 'resolu', resolution: 'refuse', resolved_by: user.name, resolved_at: nowIso } : r)),
    };
    return { next, result: { ok: true, status: 'prospect' } as const };
  });
  if (out.ok) await audit(user, resolution === 'lie' ? 'adherent.lien.valide' : 'adherent.lien.refuse', requestId, 'exemple');
  return out;
}
