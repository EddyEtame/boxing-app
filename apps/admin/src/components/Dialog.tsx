'use client';

import { useEffect, useRef, type ReactNode } from 'react';

/**
 * L'élément <dialog> natif, ouvert en modal : le focus reste dedans, Échap
 * ferme, le reste de la page devient inerte, et le focus revient où il était.
 */
export function Dialog({
  open,
  onClose,
  className,
  labelledBy,
  label,
  children,
  closeOnBackdrop = true,
}: {
  open: boolean;
  onClose: () => void;
  className?: string;
  labelledBy?: string;
  label?: string;
  children: ReactNode;
  closeOnBackdrop?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    const onCancel = (e: Event) => {
      e.preventDefault();
      onCloseRef.current();
    };
    d.addEventListener('cancel', onCancel);
    return () => d.removeEventListener('cancel', onCancel);
  }, []);

  return (
    <dialog
      ref={ref}
      className={className}
      aria-labelledby={labelledBy}
      aria-label={labelledBy ? undefined : label}
      onMouseDown={(e) => {
        if (closeOnBackdrop && e.target === ref.current) onCloseRef.current();
      }}
    >
      {open ? children : null}
    </dialog>
  );
}
