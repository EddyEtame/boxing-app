import assert from 'node:assert/strict';
import { test } from 'node:test';

import { cleanProps } from '../src/events.ts';
import { DEFAULT_DEMO, generatePassages } from '../src/demo.ts';
import { startOfWeek, ymd, type Passage } from '../src/passages.ts';
import { computeStats } from '../src/stats.ts';

// Jeudi 22 octobre 2026, 10h00, heure locale.
const NOW = new Date(2026, 9, 22, 10, 0);
const p = (date: string, heure = '19:00', club: Passage['club'] = 'minimes'): Passage => ({ date, heure, club });

test('la semaine commence le lundi, en heure locale', () => {
  assert.equal(ymd(startOfWeek(NOW)), '2026-10-19');
  assert.equal(ymd(startOfWeek(new Date(2026, 9, 19, 0, 30))), '2026-10-19');
  assert.equal(ymd(startOfWeek(new Date(2026, 9, 18, 23, 59))), '2026-10-12');
});

test('semaine, mois, total, et les passages à venir ne comptent pas', () => {
  const s = computeStats([p('2026-10-20'), p('2026-10-21'), p('2026-10-14'), p('2026-09-30'), p('2026-10-23')], NOW);
  assert.equal(s.week, 2);
  assert.equal(s.month, 3);
  assert.equal(s.monthPrev, 1);
  assert.equal(s.total, 4);
});

test('la série compte les semaines à l’objectif ; la semaine en cours ne la casse pas', () => {
  const passages = [
    // Semaine du 5 octobre : 3 ; du 12 : 3 ; en cours : 1.
    p('2026-10-05'), p('2026-10-07'), p('2026-10-09'),
    p('2026-10-12'), p('2026-10-14'), p('2026-10-16'),
    p('2026-10-20'),
  ];
  const s = computeStats(passages, NOW, { goal: 3 });
  assert.equal(s.streak, 2);
  assert.equal(s.bestStreak, 2);
  // Objectif atteint cette semaine : elle compte.
  const s2 = computeStats([...passages, p('2026-10-21'), p('2026-10-22', '08:00')], NOW, { goal: 3 });
  assert.equal(s2.streak, 3);
  // Un trou dans l'historique arrête la série.
  const s3 = computeStats([p('2026-09-28'), p('2026-09-29'), p('2026-09-30'), p('2026-10-12'), p('2026-10-13'), p('2026-10-14')], NOW, { goal: 3 });
  assert.equal(s3.streak, 1);
  assert.equal(s3.bestStreak, 1);
});

test('la carte de régularité : 15 colonnes de 7 jours, aujourd’hui marqué, le futur signalé', () => {
  const s = computeStats([p('2026-10-22', '08:00')], NOW, { heatWeeks: 15 });
  assert.equal(s.heatmap.length, 15);
  assert.equal(s.heatmap[14].length, 7);
  const today = s.heatmap[14][3];
  assert.equal(today.date, '2026-10-22');
  assert.equal(today.today, true);
  assert.equal(today.count, 1);
  assert.equal(s.heatmap[14][4].future, true);
  assert.equal(s.heatmap[0][0].date, '2026-07-13');
});

test('la répartition par club et le rythme', () => {
  const s = computeStats([p('2026-10-20', '19:00', 'minimes'), p('2026-10-21', '12:30', 'minimes'), p('2026-10-14', '19:30', 'saint-cyprien'), p('2026-10-13', '20:00', 'minimes')], NOW);
  assert.deepEqual(s.byClub.map((c) => [c.club, c.count]), [['minimes', 3], ['saint-cyprien', 1]]);
  assert.equal(Math.round(s.byClub[0].share * 100), 75);
  assert.equal(s.topMoment, 'soir');
  assert.equal(s.topDay, 1); // mardi (13 et 20 octobre 2026)
});

test('l’historique de démonstration est déterministe et ne dépasse jamais maintenant', () => {
  const a = generatePassages(DEFAULT_DEMO, NOW);
  const b = generatePassages(DEFAULT_DEMO, NOW);
  assert.deepEqual(a, b);
  assert.ok(a.length > 40 && a.length < 120, `taille ${a.length}`);
  for (const x of a) assert.ok(x.date + x.heure <= '2026-10-2210:00', `${x.date} ${x.heure}`);
  assert.ok(a.every((x) => x.club === 'minimes' || x.club === 'saint-cyprien'));
  const c = generatePassages({ ...DEFAULT_DEMO, seed: 99 }, NOW);
  assert.notDeepEqual(a, c);
});

test('les propriétés d’événement ne gardent que les clés connues et les valeurs simples', () => {
  const out = cleanProps({ club: 'minimes', email: 'x@y.fr', count: 3, nested: { a: 1 }, from: 'x'.repeat(100) });
  assert.deepEqual(Object.keys(out ?? {}).sort(), ['club', 'count', 'from']);
  assert.equal((out?.from as string).length, 64);
  assert.equal(cleanProps({ email: 'x' }), undefined);
});
