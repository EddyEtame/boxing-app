import type { ReactNode } from 'react';

import type { Scheme } from '@bc/brand';

/**
 * Le téléphone de l'aperçu : l'écran porte son ambiance (data-theme), donc
 * l'app s'affiche en clair ou en sombre quelle que soit l'ambiance de l'admin.
 */
export function Phone({ scheme, caption, size = 'md', children, time = '9:41' }: { scheme: Scheme; caption?: ReactNode; size?: 'md' | 'sm'; children: ReactNode; time?: string }) {
  return (
    <figure className="phone-wrap">
      <div className="phone" data-size={size}>
        <div className="phone-screen" data-theme={scheme}>
          <div className="app">
            <div className="app-status" aria-hidden="true">
              <span>{time}</span>
              <svg viewBox="0 0 72 14" fill="currentColor">
                <rect x="0" y="8" width="3" height="6" rx="1" />
                <rect x="5" y="5" width="3" height="9" rx="1" />
                <rect x="10" y="2" width="3" height="12" rx="1" />
                <rect x="15" y="0" width="3" height="14" rx="1" opacity="0.35" />
                <path d="M30 4.2a10 10 0 0113 0l-1.6 1.7a7.6 7.6 0 00-9.8 0zM32.6 7a6 6 0 017.8 0l-1.7 1.7a3.6 3.6 0 00-4.4 0zM36.5 13l-2-2.1a2.8 2.8 0 014 0z" />
                <rect x="50" y="1.5" width="19" height="11" rx="3" fill="none" stroke="currentColor" strokeWidth="1.2" opacity="0.5" />
                <rect x="52" y="3.5" width="13" height="7" rx="1.6" />
                <rect x="70" y="5" width="1.6" height="4" rx="0.8" opacity="0.5" />
              </svg>
            </div>
            {children}
          </div>
        </div>
      </div>
      {caption ? <figcaption className="phone-caption">{caption}</figcaption> : null}
    </figure>
  );
}
