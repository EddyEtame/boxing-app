'use client';

import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from 'react';

import { IconAlert, IconCheck, IconChevronDown, IconEdit } from '@/components/icons';
import { useT } from '@/i18n/client';

/**
 * Les champs des assistants : un libellé, une aide, une erreur liée au champ
 * (aria-describedby), un compteur quand la longueur compte. L'identifiant
 * `f-<nom>` permet à l'assistant de donner le focus au premier champ fautif.
 */
export function Field({ id, label, hint, error, optional, counter, children }: { id: string; label: ReactNode; hint?: ReactNode; error?: string; optional?: boolean; counter?: { n: number; max: number }; children: ReactNode }) {
  const t = useT();
  return (
    <div className="field" data-field={id}>
      <label className="field-label" htmlFor={`f-${id}`}>
        <span>
          {label} {optional ? <span className="opt">· {t('form.optional')}</span> : null}
        </span>
        {counter ? (
          <span className="counter" data-over={counter.n > counter.max}>
            {t('form.chars', { n: counter.n, max: counter.max })}
          </span>
        ) : null}
      </label>
      {children}
      {error ? (
        <p className="field-error" id={`f-${id}-err`}>
          <IconAlert size={15} />
          <span>{error}</span>
        </p>
      ) : hint ? (
        <p className="field-help" id={`f-${id}-help`}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}

function describedBy(id: string, error?: string, hint?: boolean) {
  return error ? `f-${id}-err` : hint ? `f-${id}-help` : undefined;
}

export function TextInput({ id, error, hint, ...rest }: { id: string; error?: string; hint?: boolean } & InputHTMLAttributes<HTMLInputElement>) {
  return <input id={`f-${id}`} className="input" aria-invalid={error ? true : undefined} aria-describedby={describedBy(id, error, hint)} {...rest} />;
}

export function TextArea({ id, error, hint, ...rest }: { id: string; error?: string; hint?: boolean } & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea id={`f-${id}`} className="textarea" aria-invalid={error ? true : undefined} aria-describedby={describedBy(id, error, hint)} {...rest} />;
}

export function Select<V extends string>({ id, value, options, onChange, error }: { id: string; value: V; options: { value: V; label: string }[]; onChange: (v: V) => void; error?: string }) {
  return (
    <div className="select-wrap">
      <select id={`f-${id}`} className="select" value={value} onChange={(e) => onChange(e.target.value as V)} aria-invalid={error ? true : undefined} aria-describedby={describedBy(id, error)}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <IconChevronDown size={18} />
    </div>
  );
}

export type ChoiceOption<V extends string> = { value: V; title: string; sub?: string; icon?: ReactNode; disabled?: boolean; tag?: ReactNode };

/** Des cartes à choisir (radio) : une question, des réponses lisibles d'un coup d'œil. */
export function Choices<V extends string>({ name, value, options, onChange, min = 200 }: { name: string; value: V | null; options: ChoiceOption<V>[]; onChange: (v: V) => void; min?: number }) {
  return (
    <div className="choices" role="radiogroup" data-field={name} style={{ '--choice-min': `${min}px` } as React.CSSProperties}>
      {options.map((o, i) => (
        <label key={o.value} className="choice">
          <input type="radio" name={name} value={o.value} checked={value === o.value} disabled={o.disabled} onChange={() => onChange(o.value)} id={i === 0 ? `f-${name}` : undefined} />
          {o.icon ? <span className="choice-icon">{o.icon}</span> : null}
          <span className="choice-title">{o.title}</span>
          {o.sub ? <span className="choice-sub">{o.sub}</span> : null}
          {o.tag ? (
            <span className="choice-tag">{o.tag}</span>
          ) : (
            <span className="choice-check" aria-hidden="true">
              <IconCheck size={13} />
            </span>
          )}
        </label>
      ))}
    </div>
  );
}

/** Des pastilles à bascule (plusieurs choix possibles). */
export function Chips<V extends string>({ id, values, options, onChange, single }: { id: string; values: V[]; options: { value: V; label: string; swatch?: string }[]; onChange: (v: V[]) => void; single?: boolean }) {
  return (
    <div className="chips" role="group" data-field={id}>
      {options.map((o, i) => {
        const on = values.includes(o.value);
        return (
          <button
            key={o.value}
            id={i === 0 ? `f-${id}` : undefined}
            type="button"
            className="chip"
            aria-pressed={on}
            onClick={() => onChange(single ? [o.value] : on ? values.filter((v) => v !== o.value) : [...values, o.value])}
          >
            {o.swatch ? <span className="swatch" style={{ background: o.swatch }} aria-hidden="true" /> : null}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function Switch({ id, checked, onChange, label, disabled }: { id?: string; checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return <button id={id ? `f-${id}` : undefined} type="button" role="switch" className="switch" aria-checked={checked} aria-label={label} disabled={disabled} onClick={() => onChange(!checked)} />;
}

export function Segmented<V extends string>({ value, options, onChange, label }: { value: V; options: { value: V; label: ReactNode }[]; onChange: (v: V) => void; label: string }) {
  return (
    <div className="seg" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} type="button" role="radio" aria-checked={value === o.value} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** La relecture de la dernière étape : chaque ligne renvoie à l'étape qui la règle. */
export function Review({ rows, goTo }: { rows: { label: string; value: ReactNode; step: string }[]; goTo: (step: string) => void }) {
  const t = useT();
  return (
    <dl className="wiz-review">
      {rows.map((r) => (
        <div key={r.label}>
          <dt>{r.label}</dt>
          <dd>{r.value}</dd>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => goTo(r.step)} aria-label={`${t('btn.edit')} : ${r.label}`}>
            <IconEdit size={15} />
            {t('btn.edit')}
          </button>
        </div>
      ))}
    </dl>
  );
}
