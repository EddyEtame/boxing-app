'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';

import { supabaseBrowser } from '@/lib/supabase-browser';

/**
 * Ecoute live_signals et rafraichit la page admin (debounce) pour messages,
 * notifications, contenus, planning, etc.
 */
export function LiveRefresh() {
  const router = useRouter();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const client = supabaseBrowser();
    if (!client) return undefined;
    const channel = client
      .channel('admin-live')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'live_signals' }, () => {
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => router.refresh(), 400);
      })
      .subscribe();
    return () => {
      if (timer.current) clearTimeout(timer.current);
      void client.removeChannel(channel);
    };
  }, [router]);

  return null;
}
