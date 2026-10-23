'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { Dialog } from '@/components/Dialog';
import { useToast } from '@/components/Toast';
import { IconAlert, IconCheck, IconClose, IconEye, IconInfo } from '@/components/icons';
import { useI18n } from '@/i18n/client';

/**
 * L'assistant pas à pas de l'admin (demande d'Eddy : « des assistants, pas des
 * formulaires »). Chaque création passe par lui :
 *  - une étape = une question, avec sa validation : on n'avance pas avec une erreur,
 *    le champ fautif est surligné et reçoit le focus ;
 *  - l'aperçu dans l'app bouge pendant qu'on écrit, sur toutes les étapes ;
 *  - la dernière étape relit tout avant d'enregistrer ;
 *  - le brouillon est gardé sur cet ordinateur : fermer par erreur ne perd rien.
 * Clavier : Ctrl+Entrée pour avancer, Échap pour fermer.
 */
export type Errors = Record<string, string>;

export type StepContext<S> = {
  state: S;
  set: (patch: Partial<S> | ((s: S) => Partial<S>)) => void;
  errors: Errors;
  show: boolean;
  goTo: (stepId: string) => void;
};

export type WizardStep<S> = {
  id: string;
  title: string;
  /** Une ligne, dans la colonne des étapes. */
  hint?: string;
  /** Le chapeau de l'étape ouverte, s'il diffère de `hint`. */
  lead?: string;
  render: (ctx: StepContext<S>) => ReactNode;
  validate?: (state: S) => Errors;
};

export type SubmitResult = { ok: true; message?: string; undo?: () => void | Promise<void> } | { ok: false; error: string; fieldErrors?: Errors; step?: string };

export function Wizard<S extends object>({
  open,
  onClose,
  kicker,
  title,
  icon,
  steps,
  initial,
  draftKey,
  preview,
  previewLabel,
  submitLabel,
  submitKind = 'primary',
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  kicker: string;
  title: string;
  icon?: ReactNode;
  steps: WizardStep<S>[];
  initial: S;
  draftKey?: string;
  preview?: (state: S, step: string) => ReactNode;
  previewLabel?: string;
  /** Une fonction de l'état quand le geste final dépend d'un choix (publier, programmer, garder en brouillon). */
  submitLabel: string | ((state: S) => string);
  submitKind?: 'primary' | 'bell';
  onSubmit: (state: S) => Promise<SubmitResult>;
}) {
  const { t, locale } = useI18n();
  const toast = useToast();
  const router = useRouter();
  const [state, setState] = useState<S>(initial);
  const [index, setIndex] = useState(0);
  const [visited, setVisited] = useState(0);
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [serverErrors, setServerErrors] = useState<Errors>({});
  const [draftAt, setDraftAt] = useState<Date | null>(null);
  const [pendingDraft, setPendingDraft] = useState<{ state: S; at: string } | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const mainRef = useRef<HTMLDivElement>(null);
  const [dirty, setDirty] = useState(false);

  const step = steps[Math.min(index, steps.length - 1)]!;
  const last = index === steps.length - 1;

  // À l'ouverture : on repart de `initial`, et on propose le brouillon s'il existe. L'état s'ajuste
  // pendant le rendu (le motif « ajuster l'état quand une prop change »), sans effet en cascade.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setState(initial);
      setIndex(0);
      setVisited(0);
      setShow(false);
      setFailure(null);
      setServerErrors({});
      setDraftAt(null);
      setDirty(false);
      let draft: { state: S; at: string } | null = null;
      if (draftKey) {
        try {
          const raw = localStorage.getItem(`bca-draft:${draftKey}`);
          if (raw) draft = JSON.parse(raw) as { state: S; at: string };
        } catch {
          // stockage indisponible : pas de brouillon, rien de grave
        }
      }
      setPendingDraft(draft);
    }
  }

  // Le brouillon : gardé 400 ms après la dernière frappe.
  useEffect(() => {
    if (!open || !draftKey || !dirty) return;
    const id = window.setTimeout(() => {
      try {
        const at = new Date();
        localStorage.setItem(`bca-draft:${draftKey}`, JSON.stringify({ state, at: at.toISOString() }));
        setDraftAt(at);
      } catch {
        // stockage plein ou bloqué
      }
    }, 400);
    return () => window.clearTimeout(id);
  }, [state, open, draftKey, dirty]);

  const set = useCallback((patch: Partial<S> | ((s: S) => Partial<S>)) => {
    setDirty(true);
    setState((s) => ({ ...s, ...(typeof patch === 'function' ? patch(s) : patch) }));
    setServerErrors({});
  }, []);

  const errors = useMemo(() => ({ ...(step.validate?.(state) ?? {}), ...serverErrors }), [step, state, serverErrors]);
  const stepErrors = useMemo(() => steps.map((s) => Object.keys(s.validate?.(state) ?? {}).length > 0), [steps, state]);

  const focusFirstError = useCallback((errs: Errors) => {
    const first = Object.keys(errs)[0];
    if (!first) return;
    requestAnimationFrame(() => {
      const el = document.getElementById(`f-${first}`) ?? mainRef.current?.querySelector<HTMLElement>(`[data-field="${first}"] input, [data-field="${first}"] button, [data-field="${first}"] textarea`);
      el?.focus();
      el?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    });
  }, []);

  const go = useCallback(
    (to: number) => {
      setIndex(to);
      setVisited((v) => Math.max(v, to));
      setShow(false);
      setFailure(null);
    },
    [],
  );

  const goTo = useCallback((id: string) => go(Math.max(0, steps.findIndex((s) => s.id === id))), [go, steps]);

  // Le focus va à la première question de l'étape (pas au bouton « Fermer »), et l'étape repart du haut.
  useEffect(() => {
    if (!open) return;
    mainRef.current?.scrollTo({ top: 0 });
    const id = requestAnimationFrame(() => {
      // Un choix déjà fait reçoit le focus : sinon la première carte paraît choisie au clavier.
      const first =
        mainRef.current?.querySelector<HTMLElement>('.wiz-form input[type=radio]:checked, .wiz-form .chip[aria-pressed="true"]') ??
        mainRef.current?.querySelector<HTMLElement>('.wiz-form input:not([disabled]):not([type=hidden]), .wiz-form textarea, .wiz-form select, .wiz-form .chip, .wiz-form .seg button, .wiz-form .btn');
      first?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(id);
  }, [open, index]);

  const next = useCallback(async () => {
    const errs = step.validate?.(state) ?? {};
    if (Object.keys(errs).length) {
      setShow(true);
      focusFirstError(errs);
      return;
    }
    if (!last) {
      go(index + 1);
      return;
    }
    // Dernière étape : on revalide tout, au cas où une étape antérieure aurait changé.
    const firstBad = steps.findIndex((s) => Object.keys(s.validate?.(state) ?? {}).length > 0);
    if (firstBad >= 0) {
      go(firstBad);
      setShow(true);
      return;
    }
    setBusy(true);
    setFailure(null);
    try {
      const res = await onSubmit(state);
      if (res.ok) {
        if (draftKey) {
          try {
            localStorage.removeItem(`bca-draft:${draftKey}`);
          } catch {
            // rien
          }
        }
        if (res.message) toast({ text: res.message, kind: 'ok', undo: res.undo });
        onClose();
        router.refresh();
      } else {
        setFailure(res.error);
        if (res.fieldErrors) {
          setServerErrors(res.fieldErrors);
          setShow(true);
          if (res.step) goTo(res.step);
          focusFirstError(res.fieldErrors);
        }
      }
    } catch {
      setFailure(t('err.reseau'));
    } finally {
      setBusy(false);
    }
  }, [step, state, last, steps, go, index, focusFirstError, onSubmit, draftKey, toast, onClose, router, t, goTo]);

  const close = useCallback(() => {
    if (busy) return;
    onClose();
  }, [busy, onClose]);

  const timeFmt = (d: Date) => d.toLocaleTimeString(locale === 'fr' ? 'fr-FR' : 'en-GB', { hour: '2-digit', minute: '2-digit' });
  const count = Object.keys(errors).length;

  return (
    <Dialog open={open} onClose={close} className="wiz" labelledBy="wiz-title" closeOnBackdrop={false}>
      <header className="wiz-head">
        {icon ? <span className="choice-icon">{icon}</span> : null}
        <div style={{ minWidth: 0, flex: 1 }}>
          <p className="eyebrow">{kicker}</p>
          <h2 id="wiz-title" className="wiz-title truncate">
            {title}
          </h2>
        </div>
        {preview ? (
          <button type="button" className="btn btn-secondary btn-sm wiz-mobile-preview" aria-pressed={previewOpen} onClick={() => setPreviewOpen((o) => !o)}>
            <IconEye size={16} />
            {t('btn.preview')}
          </button>
        ) : null}
        <button type="button" className="btn btn-ghost btn-icon" onClick={close} aria-label={t('btn.close')}>
          <IconClose />
        </button>
      </header>

      <div
        className="wiz-body"
        onKeyDown={(e) => {
          if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            void next();
          }
        }}
      >
        <nav className="wiz-steps" aria-label={t('wiz.steps')}>
          <ol>
            {steps.map((s, i) => (
              <li key={s.id}>
                <button
                  type="button"
                  className="wiz-step"
                  aria-current={i === index ? 'step' : undefined}
                  data-done={i < index && !stepErrors[i]}
                  data-error={i <= visited && i !== index && stepErrors[i]}
                  disabled={i > visited}
                  onClick={() => go(i)}
                >
                  <span className="wiz-step-n">{i < index && !stepErrors[i] ? <IconCheck size={14} /> : i + 1}</span>
                  <span>
                    <span className="wiz-step-title">{s.title}</span>
                    {s.hint ? (
                      <>
                        <br />
                        <span className="wiz-step-hint">{s.hint}</span>
                      </>
                    ) : null}
                  </span>
                </button>
              </li>
            ))}
          </ol>
        </nav>

        <div className="wiz-main" ref={mainRef}>
          <div className="wiz-form" key={step.id}>
            <div className="wiz-progress" aria-hidden="true">
              {steps.map((s, i) => (
                <span key={s.id} data-on={i <= index} />
              ))}
            </div>
            <div className="wiz-step-head">
              <p className="eyebrow">{t('wiz.stepOf', { n: index + 1, total: steps.length })}</p>
              <h3>{step.title}</h3>
              {step.lead ?? step.hint ? <p>{step.lead ?? step.hint}</p> : null}
            </div>

            {pendingDraft && index === 0 ? (
              <div className="callout" role="status">
                <IconInfo />
                <div className="stack" style={{ '--gap': '10px' } as React.CSSProperties}>
                  <span>{t('draft.resume', { time: timeFmt(new Date(pendingDraft.at)) })}</span>
                  <div className="row" style={{ '--gap': '8px' } as React.CSSProperties}>
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={() => {
                        setState({ ...initial, ...pendingDraft.state });
                        setPendingDraft(null);
                        setDirty(true);
                      }}
                    >
                      {t('draft.resumeYes')}
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => {
                        setPendingDraft(null);
                        try {
                          if (draftKey) localStorage.removeItem(`bca-draft:${draftKey}`);
                        } catch {
                          // rien
                        }
                      }}
                    >
                      {t('draft.resumeNo')}
                    </button>
                  </div>
                </div>
              </div>
            ) : null}

            {show && count > 0 ? (
              <div className="callout" data-kind="neg" role="alert">
                <IconAlert />
                <span>{t('form.errors', { n: count })}</span>
              </div>
            ) : null}

            {step.render({ state, set, errors: show ? errors : {}, show, goTo })}

            {failure ? (
              <div className="callout" data-kind="neg" role="alert">
                <IconAlert />
                <span>{failure}</span>
              </div>
            ) : null}
          </div>
        </div>

        {preview ? (
          <aside className="wiz-preview" data-open={previewOpen} aria-label={previewLabel ?? t('wiz.preview')}>
            <div className="wiz-preview-head">
              <p className="eyebrow">{previewLabel ?? t('wiz.preview')}</p>
              <span className="tag">
                <span className="dot dot-live" style={{ color: 'var(--positive)' }} />
                {t('wiz.live')}
              </span>
            </div>
            {preview(state, step.id)}
          </aside>
        ) : null}
      </div>

      <footer className="wiz-foot">
        <span className="wiz-draft" aria-live="polite">
          {draftAt ? (
            <>
              <IconCheck size={14} />
              {t('draft.saved', { time: timeFmt(draftAt) })}
            </>
          ) : (
            <span className="kbd-hint">
              <span className="kbd">Ctrl</span> <span className="kbd">{t('key.enter')}</span> {t('wiz.ctrlEnter')}
            </span>
          )}
        </span>
        <span className="spacer" />
        {index > 0 ? (
          <button type="button" className="btn btn-secondary" onClick={() => go(index - 1)} disabled={busy}>
            {t('btn.back')}
          </button>
        ) : (
          <button type="button" className="btn btn-ghost" onClick={close} disabled={busy}>
            {t('btn.cancel')}
          </button>
        )}
        <button type="button" className={`btn ${last && submitKind === 'bell' ? 'btn-bell' : 'btn-primary'}`} onClick={() => void next()} disabled={busy} aria-keyshortcuts="Control+Enter">
          {busy ? <span className="spinner" aria-hidden="true" /> : null}
          {last ? (typeof submitLabel === 'function' ? submitLabel(state) : submitLabel) : t('btn.next')}
        </button>
      </footer>
    </Dialog>
  );
}
