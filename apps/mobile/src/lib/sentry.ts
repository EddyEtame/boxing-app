import * as Sentry from '@sentry/react-native';

const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN?.trim();

if (dsn) {
  try {
    Sentry.init({
      dsn,
      environment: __DEV__ ? 'development' : 'production',
      sendDefaultPii: true,
      tracesSampleRate: __DEV__ ? 1 : 0.1,
      enableLogs: true,
      tracePropagationTargets: [/^https:\/\/api\.boxingcenter\.fr/, /^http:\/\/127\.0\.0\.1/, /^http:\/\/localhost/],
    });
  } catch {
    // Un module natif absent ne doit pas fermer l'application au lancement.
  }
}

export { Sentry };
