'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="fr">
      <body style={{ margin: 0, padding: 24, fontFamily: 'Montserrat, sans-serif', background: '#0D1120', color: '#F4F2EE' }}>
        <main style={{ maxWidth: 480 }}>
          <h1 style={{ fontSize: 'clamp(1.6rem, 5vw, 2.2rem)', margin: '0 0 12px' }}>Une erreur est survenue</h1>
          <p style={{ fontSize: 16, lineHeight: 1.5 }}>Recharge la page. Le detail est enregistre.</p>
          <button
            type="button"
            onClick={() => reset()}
            style={{ minHeight: 44, fontSize: 16, padding: '12px 16px' }}
          >
            Reessayer
          </button>
        </main>
      </body>
    </html>
  );
}
