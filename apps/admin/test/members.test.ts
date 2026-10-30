import assert from 'node:assert/strict';
import { test } from 'node:test';

import { buildOverview, memberHaystack, memberName, type LinkRequestRow, type ProfileRow, type SnapshotRow, type SubscriptionRow } from '../src/lib/members/build';

// Vendredi 30 octobre 2026, 10 h.
const NOW = new Date(2026, 9, 30, 10, 0);

const profile = (o: Partial<ProfileRow> & Pick<ProfileRow, 'id'>): ProfileRow => ({
  prenom: 'Yanis',
  nom: 'Benali',
  email: 'yanis@example.org',
  telephone: '06 12 34 56 78',
  date_naissance: '2001-04-12',
  club_principal: 'minimes',
  link_status: 'en_attente',
  link_updated_at: null,
  deciplus_member_id: null,
  consentement_parental_requis: false,
  created_at: '2026-10-28T09:00:00.000Z',
  ...o,
});

const snapshot = (profileId: string, o: Partial<SnapshotRow> = {}): SnapshotRow => ({ profile_id: profileId, abonnement_actif: true, abonnement_en_attente: false, badge_enregistre: true, contrats: ['Illimité 12 mois'], club: 'st-cyprien', read_at: '2026-10-29T18:00:00.000Z', ...o });

const request = (o: Partial<LinkRequestRow> & Pick<LinkRequestRow, 'id' | 'profile_id'>): LinkRequestRow => ({
  order_id: `ord-${o.id}`,
  status: 'a_revoir',
  deciplus_member_id: '48213',
  mismatch_fields: ['telephone'],
  reason: null,
  resolution: null,
  resolved_by: null,
  created_at: '2026-10-29T08:00:00.000Z',
  decided_at: '2026-10-29T08:00:05.000Z',
  resolved_at: null,
  ...o,
});

test("l'espace intégral exige une fiche liée et un abonnement actif ; le reste est restreint", () => {
  const rows = {
    profiles: [profile({ id: 'a', link_status: 'lie', deciplus_member_id: '48213' }), profile({ id: 'b', link_status: 'lie', deciplus_member_id: '48214' }), profile({ id: 'c', link_status: 'prospect' })],
    snapshots: [snapshot('a'), snapshot('b', { abonnement_actif: false, abonnement_en_attente: true })],
    subscriptions: [] as SubscriptionRow[],
    requests: [] as LinkRequestRow[],
  };
  const o = buildOverview(rows, NOW);
  const by = Object.fromEntries(o.members.map((m) => [m.id, m]));
  assert.equal(by.a!.statut, 'actif');
  assert.equal(by.b!.statut, 'restreint', 'fiche liée mais abonnement en attente');
  assert.equal(by.c!.statut, 'restreint');
  assert.equal(by.a!.snapshot?.club, 'saint-cyprien', 'la clé de salle du robot devient le club de l’app');
  assert.deepEqual(o.byLink, { en_attente: 0, lie: 2, a_revoir: 0, prospect: 1 });
  assert.equal(o.actifs, 1);
  assert.equal(o.total, 3);
});

test('la file ne garde que les demandes « à revoir » dont le compte existe, la plus ancienne en tête', () => {
  const rows = {
    profiles: [profile({ id: 'a', link_status: 'a_revoir' }), profile({ id: 'b', link_status: 'a_revoir', created_at: '2026-10-29T09:00:00.000Z' })],
    snapshots: [],
    subscriptions: [],
    requests: [
      request({ id: 'r2', profile_id: 'b', created_at: '2026-10-29T12:00:00.000Z', deciplus_member_id: null, reason: 'aucune_fiche', mismatch_fields: null }),
      request({ id: 'r1', profile_id: 'a', created_at: '2026-10-28T12:00:00.000Z' }),
      request({ id: 'r3', profile_id: 'zombie', created_at: '2026-10-27T12:00:00.000Z' }),
      request({ id: 'r4', profile_id: 'a', status: 'resolu', resolution: 'refuse', resolved_by: 'acc_1', resolved_at: '2026-10-20T10:00:00.000Z' }),
      request({ id: 'r5', profile_id: 'a', status: 'lie' }),
    ],
  };
  const o = buildOverview(rows, NOW);
  assert.deepEqual(
    o.queue.map((q) => q.id),
    ['r1', 'r2'],
  );
  assert.equal(o.queue[1]!.deciplusMemberId, null);
  assert.deepEqual(o.queue[1]!.mismatchFields, [], 'un tableau absent devient vide');
  assert.equal(o.queue[0]!.member.id, 'a');
  assert.deepEqual(
    o.decisions.map((d) => [d.id, d.resolution]),
    [['r4', 'refuse']],
  );
  assert.equal(o.recent, 2, 'deux comptes créés dans la semaine');
});

test("l'abonnement pris dans l'app et les champs douteux sont bornés et nettoyés", () => {
  const rows = {
    profiles: [profile({ id: 'a', prenom: '  Inès ', nom: 'D', club_principal: 'pluton', date_naissance: '1999-12-31T00:00:00+01:00', link_status: 'bizarre' })],
    snapshots: [snapshot('a', { contrats: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'], club: 'atlantis' })],
    subscriptions: [{ profile_id: 'a', status: 'past_due', plan_label: 'Illimité', next_charge_date: '2026-11-05', current_period_end: '2026-11-30T00:00:00Z', badge_active: true }],
    requests: [],
  };
  const m = buildOverview(rows, NOW).members[0]!;
  assert.equal(memberName(m), 'Inès D');
  assert.equal(m.clubPrincipal, null, 'un club inconnu ne passe pas');
  assert.equal(m.dateNaissance, '1999-12-31');
  assert.equal(m.linkStatus, 'en_attente', 'un statut inconnu retombe sur « en attente »');
  assert.equal(m.snapshot?.contrats.length, 8);
  assert.equal(m.snapshot?.club, null);
  assert.equal(m.subscription?.status, 'past_due');
  assert.equal(m.subscription?.currentPeriodEnd, '2026-11-30');
  assert.ok(memberHaystack(m).includes('0612345678'), 'le téléphone se cherche en chiffres');
});
