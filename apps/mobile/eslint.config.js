// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    // Fichiers générés : types d'expo-router, projets natifs du prebuild (CI).
    ignores: ['dist/*', '.expo/*', 'android/*', 'ios/*'],
  },
]);
