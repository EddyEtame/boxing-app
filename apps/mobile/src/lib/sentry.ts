import * as Sentry from '@sentry/react-native';

const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN?.trim();

if (dsn) {
  Sentry.init({
    dsn,
    environment: __DEV__ ? 'development' : 'production',
    sendDefaultPii: true,
    integrations: [Sentry.mobileReplayIntegration(), Sentry.feedbackIntegration()],
    tracesSampleRate: __DEV__ ? 1 : 0.1,
    profilesSampleRate: __DEV__ ? 1 : 0.1,
    enableLogs: true,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1,
    tracePropagationTargets: [/^https:\/\/api\.boxingcenter\.fr/, /^http:\/\/127\.0\.0\.1/, /^http:\/\/localhost/],
  });
}

export { Sentry };
