import * as Sentry from '@sentry/nextjs';

const dsn = process.env.SENTRY_DSN?.trim();
const production = process.env.NODE_ENV === 'production';

if (dsn) {
  Sentry.init({
    dsn,
    environment: production ? 'production' : 'development',
    tracesSampleRate: production ? 0.1 : 1,
  });
}
