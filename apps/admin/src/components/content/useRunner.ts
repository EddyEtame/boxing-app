'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useTransition } from 'react';

import { useToast } from '@/components/Toast';
import { useI18n } from '@/i18n/client';
import type { MessageKey } from '@/i18n/messages';
import type { ActionResult } from '@/lib/action-result';

/**
 * Lance une action serveur, répond par un toast (avec « Annuler l'action »
 * quand le serveur a gardé l'avant), puis relit la page. Une erreur dit
 * pourquoi, avec les mots du dictionnaire.
 */
export function useRunner(undoAction?: (token: string) => Promise<ActionResult<unknown>>) {
  const { t } = useI18n();
  const toast = useToast();
  const router = useRouter();
  const [pending, start] = useTransition();

  const undo = useCallback(
    async (token: string) => {
      if (!undoAction) return;
      const res = await undoAction(token);
      toast(res.ok ? { text: t('contenu.done.undone') } : { text: t(`err.${res.error}` as MessageKey), kind: 'err' });
      start(() => router.refresh());
    },
    [undoAction, toast, t, router],
  );

  const run = useCallback(
    async <T,>(call: Promise<ActionResult<T>>, describe: (data: T) => { text: string; undo?: string | null }) => {
      try {
        const res = await call;
        if (!res.ok) {
          toast({ text: t(`err.${res.error}` as MessageKey), kind: 'err' });
          return null;
        }
        const d = describe(res.data);
        toast({ text: d.text, undo: d.undo && undoAction ? () => undo(d.undo!) : undefined });
        start(() => router.refresh());
        return res.data;
      } catch {
        toast({ text: t('err.reseau'), kind: 'err' });
        return null;
      }
    },
    [toast, t, undo, undoAction, router],
  );

  return { run, undo, pending };
}
