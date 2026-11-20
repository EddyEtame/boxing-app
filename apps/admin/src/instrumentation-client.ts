import * as Sentry from '@sentry/nextjs';

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN?.trim();
const production = process.env.NODE_ENV === 'production';

if (dsn) {
  Sentry.init({
    dsn,
    environment: production ? 'production' : 'development',
    integrations: [Sentry.replayIntegration(), Sentry.feedbackIntegration({ colorScheme: 'system' })],
    tracesSampleRate: production ? 0.1 : 1,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1,
    tracePropagationTargets: [/^https:\/\/api\.boxingcenter\.fr/, /^http:\/\/127\.0\.0\.1/, /^http:\/\/localhost/],
  });
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
