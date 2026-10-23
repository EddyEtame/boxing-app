'use client';

import { useState } from 'react';

import { IconCheck, IconCopy } from './icons';
import { useT } from '@/i18n/client';

/** Copier en un clic, avec la réponse visible (« Copié ») au même endroit que le geste. */
export function CopyButton({ value, label, className = 'btn btn-ghost btn-sm' }: { value: string; label?: string; className?: string }) {
  const t = useT();
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className={className}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
        } catch {
          // Presse-papiers refusé : on sélectionne le texte voisin à la place.
          const ta = document.createElement('textarea');
          ta.value = value;
          document.body.appendChild(ta);
          ta.select();
          document.execCommand('copy');
          ta.remove();
        }
        setDone(true);
        window.setTimeout(() => setDone(false), 1600);
      }}
      aria-label={label ?? t('btn.copy')}
    >
      {done ? <IconCheck size={15} /> : <IconCopy size={15} />}
      {done ? t('btn.copied') : (label ?? t('btn.copy'))}
    </button>
  );
}
