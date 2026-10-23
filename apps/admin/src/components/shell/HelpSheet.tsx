'use client';

import { Dialog } from '@/components/Dialog';
import { IconClose, IconHelp, IconSparkle } from '@/components/icons';
import { useI18n } from '@/i18n/client';
import { helpFor } from '@/lib/help';
import type { Section } from '@/lib/nav';

/** Le panneau « ? » : ce que fait la rubrique ouverte, le CDC qui la demande, comment faire, ses règles, les raccourcis. */
export function HelpSheet({ open, onClose, section, onTour }: { open: boolean; onClose: () => void; section: Section; onTour: () => void }) {
  const { t, messages } = useI18n();
  const h = helpFor(section.id, messages);

  return (
    <Dialog open={open} onClose={onClose} className="sheet" labelledBy="help-title">
      <div className="sheet-head">
        <div className="row" style={{ '--gap': '10px' } as React.CSSProperties}>
          <span className="choice-icon" style={{ margin: 0 }}>
            <IconHelp size={20} />
          </span>
          <div>
            <p className="eyebrow">{t('help.title')}</p>
            <h2 id="help-title" className="panel-title">
              {t(section.label)}
            </h2>
          </div>
        </div>
        <button type="button" className="btn btn-ghost btn-icon" onClick={onClose} aria-label={t('help.close')}>
          <IconClose />
        </button>
      </div>
      <div className="sheet-body stack" style={{ '--gap': '26px' } as React.CSSProperties}>
        <p style={{ fontSize: 15.5, lineHeight: 1.55 }}>{t(h.intro)}</p>

        <section className="stack" style={{ '--gap': '10px' } as React.CSSProperties} aria-labelledby="help-cdc">
          <h3 id="help-cdc" className="eyebrow">
            {t('help.cdc')}
          </h3>
          <blockquote className="help-cdc">
            <span>{t(h.cdc)}</span>
            <span className="mono">CDC {section.cdc}</span>
          </blockquote>
        </section>

        {h.steps.length ? (
          <section className="stack" style={{ '--gap': '12px' } as React.CSSProperties} aria-labelledby="help-how">
            <h3 id="help-how" className="eyebrow">
              {t('help.how')}
            </h3>
            <ol className="help-steps">
              {h.steps.map((k) => (
                <li key={k}>{t(k)}</li>
              ))}
            </ol>
          </section>
        ) : null}

        {h.rules.length ? (
          <section className="stack" style={{ '--gap': '12px' } as React.CSSProperties} aria-labelledby="help-rules">
            <h3 id="help-rules" className="eyebrow">
              {t('help.rules')}
            </h3>
            <ul className="help-rules">
              {h.rules.map((k) => (
                <li key={k}>{t(k)}</li>
              ))}
            </ul>
          </section>
        ) : null}

        <section className="stack" style={{ '--gap': '12px' } as React.CSSProperties} aria-labelledby="help-keys">
          <h3 id="help-keys" className="eyebrow">
            {t('help.keys')}
          </h3>
          <div className="help-keys">
            <div>
              <span>{t('help.key.palette')}</span>
              <span className="row" style={{ '--gap': '4px' } as React.CSSProperties}>
                <span className="kbd">Ctrl</span>
                <span className="kbd">K</span>
              </span>
            </div>
            <div>
              <span>{t('help.key.help')}</span>
              <span className="kbd">?</span>
            </div>
            <div>
              <span>{t('help.key.go')}</span>
              <span className="row" style={{ '--gap': '4px' } as React.CSSProperties}>
                <span className="kbd">G</span>
                <span className="kbd">P</span>
              </span>
            </div>
            <div>
              <span>{t('help.key.next')}</span>
              <span className="row" style={{ '--gap': '4px' } as React.CSSProperties}>
                <span className="kbd">Ctrl</span>
                <span className="kbd">{t('key.enter')}</span>
              </span>
            </div>
            <div>
              <span>{t('help.key.escape')}</span>
              <span className="kbd">Esc</span>
            </div>
          </div>
        </section>

        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => {
            onClose();
            onTour();
          }}
        >
          <IconSparkle size={18} />
          {t('help.replay')}
        </button>
      </div>
    </Dialog>
  );
}
