'use client';

import { createContext, use, useCallback, useMemo, useRef, useState, type ReactNode } from 'react';

import { IconAlert, IconCheck, IconClose } from './icons';
import { useT } from '@/i18n/client';

/**
 * Une réponse visible à chaque action (leçon du panneau de la boutique : « on
 * cliquait, rien ne bougeait, on recliquait »). `role=status` : on informe
 * sans interrompre la lecture d'un lecteur d'écran. Une action réversible
 * propose « Annuler l'action » pendant quelques secondes.
 */
type ToastInput = { text: string; kind?: 'ok' | 'err'; undo?: () => void | Promise<void> };
type ToastItem = ToastInput & { id: number };

const ToastContext = createContext<((t: ToastInput) => void) | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const seq = useRef(0);
  const t = useT();

  const dismiss = useCallback((id: number) => setItems((list) => list.filter((x) => x.id !== id)), []);

  const push = useCallback(
    (input: ToastInput) => {
      const id = ++seq.current;
      setItems((list) => [...list.slice(-3), { ...input, id }]);
      window.setTimeout(() => dismiss(id), input.kind === 'err' ? 9000 : input.undo ? 7000 : 4200);
    },
    [dismiss],
  );

  const value = useMemo(() => push, [push]);

  return (
    <ToastContext value={value}>
      {children}
      <div className="toasts" aria-live="polite">
        {items.map((item) => (
          <div key={item.id} className="toast" data-kind={item.kind ?? 'ok'} role="status">
            <span className="toast-icon">{item.kind === 'err' ? <IconAlert size={18} /> : <IconCheck size={18} />}</span>
            <span className="toast-text">{item.text}</span>
            {item.undo ? (
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={async () => {
                  dismiss(item.id);
                  await item.undo?.();
                }}
              >
                {t('btn.undo')}
              </button>
            ) : null}
            <button type="button" className="btn btn-ghost btn-sm btn-icon" aria-label={t('btn.close')} onClick={() => dismiss(item.id)}>
              <IconClose size={16} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext>
  );
}

export function useToast() {
  const ctx = use(ToastContext);
  if (!ctx) throw new Error('useToast hors de ToastProvider');
  return ctx;
}
