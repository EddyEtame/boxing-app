import assert from 'node:assert/strict';
import { test } from 'node:test';

import { ageAt, clubFromDeciplusGym, statutFor } from '../src/me.ts';

test('l’espace intégral exige une fiche liée et un abonnement en cours', () => {
  assert.equal(statutFor('lie', { abonnementActif: true }), 'actif');
  assert.equal(statutFor('lie', { abonnementActif: false }), 'restreint');
  assert.equal(statutFor('lie', null), 'restreint');
  assert.equal(statutFor('a_revoir', { abonnementActif: true }), 'restreint');
  assert.equal(statutFor('en_attente', { abonnementActif: true }), 'restreint');
  assert.equal(statutFor('prospect', null), 'restreint');
});

test('les salles du robot deviennent les clubs de l’app ; Balma n’existe plus', () => {
  assert.equal(clubFromDeciplusGym('st-cyprien'), 'saint-cyprien');
  assert.equal(clubFromDeciplusGym('Minimes'), 'minimes');
  assert.equal(clubFromDeciplusGym('balma'), null);
  assert.equal(clubFromDeciplusGym(null), null);
});

test('l’âge se compte au jour près', () => {
  const now = new Date(2026, 9, 23);
  assert.equal(ageAt('2011-10-23', now), 15);
  assert.equal(ageAt('2011-10-24', now), 14);
  assert.equal(ageAt('1996-04-12', now), 30);
});
