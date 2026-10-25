import { clubFromDeciplusGym } from '@bc/contract';

import { FicheDejaLieeError, type LinkRequest, type Profile, type Snapshot, type Store } from './store.ts';

export type FichePayload = {
  abonnement_actif: boolean;
  abonnement_en_attente: boolean;
  badge_enregistre: boolean;
  contrats: string[];
  club: string | null;
};

export type MemberStatusPayload = {
  decision: 'lie' | 'a_revoir' | 'prospect';
  deciplus_member_id: string | null;
  mismatch_fields: string[];
  reason: string | null;
  fiche: FichePayload | null;
  read_at: string;
};

const DECIDED = new Set(['lie', 'a_revoir', 'prospect', 'resolu']);

export function isDecided(request: LinkRequest): boolean {
  return DECIDED.has(request.status);
}

function readAt(value: string, now: Date): string {
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return now.toISOString();
  return new Date(parsed).toISOString();
}

function snapshotOf(profileId: string, fiche: FichePayload, read: string): Snapshot {
  return {
    profile_id: profileId,
    abonnement_actif: fiche.abonnement_actif,
    abonnement_en_attente: fiche.abonnement_en_attente,
    badge_enregistre: fiche.badge_enregistre,
    contrats: fiche.contrats,
    club: fiche.club,
    read_at: read,
  };
}

async function closeRequest(
  store: Store,
  request: LinkRequest,
  outcome: 'lie' | 'a_revoir' | 'prospect',
  memberId: string | null,
  mismatch: string[],
  reason: string | null,
  nowIso: string,
): Promise<void> {
  await store.updateLinkRequest(request.id, {
    status: outcome,
    deciplus_member_id: memberId,
    mismatch_fields: mismatch,
    reason,
    decided_at: nowIso,
  });
}

/**
 * Applique le retour du robot.
 * Une fiche deja portee par un autre profil devient une revue (fiche_deja_liee).
 * Un profil deja lie qui recoit une relecture garde son statut ; seule la fiche bouge.
 */
export async function applyMemberStatus(store: Store, request: LinkRequest, payload: MemberStatusPayload, now: Date): Promise<'lie' | 'a_revoir' | 'prospect'> {
  const nowIso = now.toISOString();
  const profile = await store.getProfile(request.profile_id);
  let outcome = payload.decision;
  let reason = payload.reason;
  const memberId = payload.deciplus_member_id;

  if (outcome === 'lie') {
    const taken = memberId ? await store.findOtherProfileByMemberId(memberId, request.profile_id) : false;
    if (!memberId || taken) {
      outcome = 'a_revoir';
      reason = memberId ? 'fiche_deja_liee' : 'identifiant_manquant';
    }
  }

  if (!profile) {
    await closeRequest(store, request, outcome, memberId, payload.mismatch_fields, reason, nowIso);
    return outcome;
  }

  const read = readAt(payload.read_at, now);
  if (outcome === 'lie' && memberId) {
    const club = payload.fiche ? clubFromDeciplusGym(payload.fiche.club) : null;
    try {
      await store.updateProfile(profile.id, {
        link_status: 'lie',
        link_updated_at: nowIso,
        deciplus_member_id: memberId,
        ...(!profile.club_principal && club ? { club_principal: club } : {}),
      });
    } catch (err) {
      if (!(err instanceof FicheDejaLieeError)) throw err;
      if (profile.link_status !== 'lie') {
        await store.updateProfile(profile.id, { link_status: 'a_revoir', link_updated_at: nowIso });
      }
      await closeRequest(store, request, 'a_revoir', memberId, payload.mismatch_fields, 'fiche_deja_liee', nowIso);
      return 'a_revoir';
    }
    if (payload.fiche) await store.upsertSnapshot(snapshotOf(profile.id, payload.fiche, read));
    await closeRequest(store, request, 'lie', memberId, payload.mismatch_fields, reason, nowIso);
    return 'lie';
  }

  // Une fiche refusee parce qu'elle appartient a quelqu'un d'autre ne remplace pas la fiche deja liee.
  const downgraded = payload.decision === 'lie' && outcome !== 'lie';
  if (profile.link_status === 'lie' && !downgraded) {
    if (payload.fiche) await store.upsertSnapshot(snapshotOf(profile.id, payload.fiche, read));
  } else if (profile.link_status !== 'lie') {
    await store.updateProfile(profile.id, { link_status: outcome, link_updated_at: nowIso });
  }
  await closeRequest(store, request, outcome, memberId, payload.mismatch_fields, reason, nowIso);
  return outcome;
}

export function profileIsComplete(profile: Profile): boolean {
  return Boolean(profile.telephone.trim() && profile.date_naissance);
}
