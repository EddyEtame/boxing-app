import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const ici = dirname(fileURLToPath(import.meta.url));

test('le demarrage ne demande pas a Android de relancer l activite', () => {
  const layout = readFileSync(join(ici, '../app/_layout.tsx'), 'utf8');
  assert.equal(layout.includes('confierAmbiance'), false);
});

test('le module natif ignore un mode deja confie, pour ne pas fermer l application', () => {
  const kt = readFileSync(
    join(ici, '../../modules/bc-ambiance/android/src/main/java/fr/boxingcenter/ambiance/AmbianceModule.kt'),
    'utf8',
  );
  assert.match(kt, /getString\("mode", null\) == mode/);
  assert.match(kt, /\.commit\(\)/);
});
