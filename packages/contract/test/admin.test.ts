import assert from 'node:assert/strict';
import { test } from 'node:test';

import { isAccesLibre, isNotifEssential, NOTIF_OPTIONAL, NOTIF_TYPES, plagesLibres, type PublicHoraire, type PublicSlot } from '../src/admin.ts';

// Du lundi au samedi, 10h00 – 21h30, fermé le dimanche : la règle publiée par les clubs.
const SEMAINE: PublicHoraire[] = [0, 1, 2, 3, 4, 5].map((jour) => ({ jour, debut: 600, fin: 1290 }));
const slot = (o: Partial<PublicSlot> & Pick<PublicSlot, 'id' | 'jour' | 'debut' | 'fin' | 'activite'>): PublicSlot => ({ club: 'saint-cyprien', ...o });

test('une ligne « ACCES LIBRE » se reconnaît, espaces et casse compris', () => {
  assert.equal(isAccesLibre('ACCES LIBRE'), true);
  assert.equal(isAccesLibre('  acces   libre (fitness)'), true);
  assert.equal(isAccesLibre('BOXE ANGLAISE'), false);
});

test("sans ligne au planning, l'accès libre suit l'ouverture du club", () => {
  assert.deepEqual(plagesLibres([], SEMAINE, 'minimes', 2), [{ jour: 2, debut: 600, fin: 1290, source: 'ouverture' }]);
  assert.deepEqual(plagesLibres([], SEMAINE, 'minimes', 6), [], 'le dimanche, club fermé');
});

test('les lignes du planning priment ce jour-là, et ce jour-là seulement', () => {
  const slots = [
    slot({ id: 'b', jour: 0, debut: 855, fin: 1095, activite: 'ACCES LIBRE' }),
    slot({ id: 'a', jour: 0, debut: 600, fin: 720, activite: 'ACCES LIBRE', espace: 'Fitness' }),
    slot({ id: 'c', jour: 0, debut: 1110, fin: 1200, activite: 'BOXE ANGLAISE' }),
    slot({ id: 'd', club: 'portet', jour: 1, debut: 600, fin: 660, activite: 'ACCES LIBRE' }),
  ];
  assert.deepEqual(plagesLibres(slots, SEMAINE, 'saint-cyprien', 0), [
    { jour: 0, debut: 600, fin: 720, source: 'planning', slotId: 'a', espace: 'Fitness' },
    { jour: 0, debut: 855, fin: 1095, source: 'planning', slotId: 'b' },
  ]);
  assert.deepEqual(plagesLibres(slots, SEMAINE, 'saint-cyprien', 1), [{ jour: 1, debut: 600, fin: 1290, source: 'ouverture' }], "le mardi n'a pas de ligne");
  assert.equal(plagesLibres(slots, SEMAINE, 'saint-cyprien', 1).length, 1, "la ligne de Portet ne compte pas pour Saint-Cyprien");
});

test('seules les offres et les nouvelles vidéos se coupent ; tout le reste est essentiel', () => {
  assert.deepEqual([...NOTIF_OPTIONAL], ['promo', 'video']);
  assert.deepEqual(NOTIF_TYPES.filter((t) => !isNotifEssential(t)), ['promo', 'video']);
  for (const t of ['direction', 'coach', 'evenement', 'club', 'rappel', 'rencontre', 'echeance', 'impaye'] as const) assert.equal(isNotifEssential(t), true, t);
});
