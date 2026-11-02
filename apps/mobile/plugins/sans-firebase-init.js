const { withAndroidManifest } = require('expo/config-plugins');

/**
 * expo-notifications embarque Firebase. Sans google-services.json, le
 * fournisseur FirebaseInitProvider tue le processus avant le premier ecran.
 * Les notifications locales n'en ont pas besoin : on retire seulement ce
 * demarrage automatique. Le push distant attendra un vrai fichier Google.
 */
function sansFirebaseInit(config) {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;
    manifest.$ = manifest.$ || {};
    manifest.$['xmlns:tools'] = 'http://schemas.android.com/tools';
    const application = manifest.application && manifest.application[0];
    if (!application) return config;
    application.provider = application.provider || [];
    application.provider.push({
      $: {
        'android:name': 'com.google.firebase.provider.FirebaseInitProvider',
        'tools:node': 'remove',
      },
    });
    return config;
  });
}

module.exports = sansFirebaseInit;
