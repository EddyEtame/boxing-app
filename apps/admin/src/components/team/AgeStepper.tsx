'use client';

import { IconMinus, IconPlus } from '@/components/icons';
import { useT } from '@/i18n/client';

/** Un âge, réglé au clavier (flèches) ou aux boutons, jamais hors de ses bornes. */
export function AgeStepper({ id, value, min, max, onChange, label }: { id: string; value: number; min: number; max: number; onChange: (v: number) => void; label: string }) {
  const t = useT();
  const clamp = (v: number) => Math.max(min, Math.min(max, Math.round(v)));
  return (
    <div className="team-stepper" role="group" aria-label={label}>
      <button type="button" className="btn btn-secondary btn-icon" onClick={() => onChange(clamp(value - 1))} disabled={value <= min} aria-label={t('team.stepper.less')}>
        <IconMinus size={18} />
      </button>
      <span className="team-stepper-value">
        <input
          id={`f-${id}`}
          className="input"
          type="number"
          inputMode="numeric"
          min={min}
          max={max}
          value={value}
          onChange={(e) => {
            const n = Number(e.target.value);
            if (Number.isFinite(n)) onChange(clamp(n));
          }}
          aria-label={label}
        />
        <span aria-hidden="true">{t('team.stepper.years')}</span>
      </span>
      <button type="button" className="btn btn-secondary btn-icon" onClick={() => onChange(clamp(value + 1))} disabled={value >= max} aria-label={t('team.stepper.more')}>
        <IconPlus size={18} />
      </button>
    </div>
  );
}
