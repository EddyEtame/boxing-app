import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { ouvertMaintenant, parisStamp, prochaineCours, type LivePlanning } from './live.ts';

const SEMAINE = { jours: [0, 1, 2, 3, 4, 5], debut: 10 * 60, fin: 21 * 60 + 30 };
const club = { id: 'minimes', ouverture: SEMAINE };
const HORAIRES = [0, 1, 2, 3, 4, 5].map((jour) => ({ jour, debut: 10 * 60, fin: 21 * 60 + 30 }));

describe('hors ligne', () => {
  it('reprend l horloge locale et ignore les annulations', () => {
    const now = new Date(2026, 10, 2, 15, 0, 0);
    const jour = (now.getDay() + 6) % 7;
    const min = now.getHours() * 60 + now.getMinutes();
    const slots = [
      { id: 'passe', club: 'minimes', jour, debut: 10 * 60 },
      { id: 'annule', club: 'minimes', jour, debut: 17 * 60 },
      { id: 'prochain', club: 'minimes', jour, debut: 18 * 60 },
    ];
    const found = prochaineCours(slots, now, null);
    assert.equal(found?.slot.id, 'annule');
    const etat = ouvertMaintenant(club, now, null);
    const attendu = SEMAINE.jours.includes(jour) && min >= SEMAINE.debut && min < SEMAINE.fin;
    assert.equal(etat.ouvert, attendu);
    assert.equal(etat.jusqua, attendu ? SEMAINE.fin : null);
  });
});

describe('en ligne', () => {
  it('un club ferme ce jour-la saute la seance', () => {
    const now = new Date('2026-11-02T15:00:00.000Z');
    assert.equal(parisStamp(now).ymd, '2026-11-02');
    assert.equal(parisStamp(now).jour, 0);
    const live: LivePlanning = {
      horaires: { minimes: HORAIRES },
      fermetures: [{ club: 'minimes', date: '2026-11-02' }],
      cancellations: [],
    };
    const slots = [
      { id: 'lundi', club: 'minimes', jour: 0, debut: 18 * 60 },
      { id: 'mardi', club: 'minimes', jour: 1, debut: 18 * 60 },
    ];
    assert.equal(prochaineCours(slots, now, live)?.slot.id, 'mardi');
    assert.equal(ouvertMaintenant(club, now, live).ouvert, false);
  });

  it('une seance annulee a minuit a Toulouse laisse la suivante', () => {
    const now = new Date('2026-11-01T23:30:00.000Z');
    const stamp = parisStamp(now);
    assert.equal(stamp.ymd, '2026-11-02');
    assert.equal(stamp.jour, 0);
    assert.equal(stamp.min, 30);
    const live: LivePlanning = {
      horaires: { minimes: HORAIRES },
      fermetures: [],
      cancellations: [{ slotId: 'annule', date: '2026-11-02' }],
    };
    const slots = [
      { id: 'annule', club: 'minimes', jour: 0, debut: 18 * 60 },
      { id: 'suivant', club: 'minimes', jour: 0, debut: 19 * 60 },
    ];
    assert.equal(prochaineCours(slots, now, live)?.slot.id, 'suivant');
    assert.equal(ouvertMaintenant(club, now, live).ouvert, false);
  });
});
