import assert from 'node:assert/strict';
import test from 'node:test';

const configuration = {
  EXPO_PUBLIC_API_URL: 'https://admin.example/',
  EXPO_PUBLIC_MEMBER_API_URL: 'https://membres.example/',
  EXPO_PUBLIC_SUPABASE_URL: 'https://supabase.example',
  EXPO_PUBLIC_SUPABASE_ANON_KEY: 'cle-de-test',
};

test('les deux API restent inactives si une variable manque', async () => {
  const variables = Object.keys(configuration);
  const valeursInitiales = variables.map((nom) => process.env[nom]);
  const moduleConfig = new URL('config.ts', import.meta.url);

  try {
    for (const manquante of variables) {
      Object.assign(process.env, configuration);
      process.env[manquante] = ' ';
      const { configReady, API_URL, MEMBER_API_URL } = await import(`${moduleConfig.href}?sans=${manquante}`);
      assert.equal(configReady, false, manquante);
      assert.equal(API_URL, '', manquante);
      assert.equal(MEMBER_API_URL, '', manquante);
    }

    Object.assign(process.env, configuration);
    const { configReady, API_URL, MEMBER_API_URL } = await import(`${moduleConfig.href}?complete`);
    assert.equal(configReady, true);
    assert.equal(API_URL, 'https://admin.example');
    assert.equal(MEMBER_API_URL, 'https://membres.example');
  } finally {
    for (const [index, nom] of variables.entries()) {
      const valeur = valeursInitiales[index];
      if (valeur === undefined) delete process.env[nom];
      else process.env[nom] = valeur;
    }
  }
});
