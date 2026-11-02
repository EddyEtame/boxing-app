import * as Sentry from '@sentry/node';

const dsn = process.env.SENTRY_DSN?.trim();

if (dsn) {
  const production = process.env.NODE_ENV === 'production';
  const integrations = [];
  try {
    const { nodeProfilingIntegration } = await import('@sentry/profiling-node');
    integrations.push(nodeProfilingIntegration());
  } catch {
    // Le module natif de profiling exige un Node recent. Les erreurs partent quand meme.
  }
  if (typeof Sentry.fastifyIntegration === 'function') {
    integrations.push(Sentry.fastifyIntegration());
  }
  Sentry.init({
    dsn,
    environment: production ? 'production' : 'development',
    integrations,
    tracesSampleRate: production ? 0.1 : 1,
    profileSessionSampleRate: production ? 0.1 : 1,
  });
}
