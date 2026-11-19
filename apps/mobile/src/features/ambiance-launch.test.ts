import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const ici = dirname(fileURLToPath(import.meta.url));

test('le demarrage ne demande pas a Android de relancer l activite', () => {
  const layout = readFileSync(join(ici, '../app/_layout.tsx'), 'utf8');
  assert.equal(layout.includes('confierAmbiance'), false);
  assert.equal(layout.includes("from '@/lib/sentry'"), false);
  assert.equal(layout.includes("from '@/lib/background'"), false);
  assert.equal(layout.includes("from 'react-native-reanimated'"), false);
});

test('la version et le numero Android sont dans app.json, avec les regles R8', () => {
  const app = readFileSync(join(ici, '../../app.json'), 'utf8');
  assert.match(app, /"version": "\d+\.\d+\.\d+"/);
  assert.match(app, /"versionCode": \d+/);
  assert.match(app, /extends androidx\.room\.RoomDatabase/);
  assert.match(app, /extends androidx\.work\.InputMerger/);
});

test('le module natif ignore un mode deja confie, pour ne pas fermer l application', () => {
  const kt = readFileSync(
    join(ici, '../../modules/bc-ambiance/android/src/main/java/fr/boxingcenter/ambiance/AmbianceModule.kt'),
    'utf8',
  );
  assert.match(kt, /getString\("mode", null\) == mode/);
  assert.match(kt, /\.commit\(\)/);
});
