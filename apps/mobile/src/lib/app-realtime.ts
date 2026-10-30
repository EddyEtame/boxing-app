import type { CheckoutStatus, SubscriptionStatus } from '@bc/contract';
import { useEffect, useState } from 'react';

import { emitLiveSignal, onLiveSignal } from '@/lib/live-bus';
import { supabase } from '@/lib/supabase';

/** Bus global (messages, notifs, contenus, planning...) via live_signals. */
export function useLiveSignalSubscription(): void {
  useEffect(() => {
    const client = supabase;
    if (!client) return undefined;
    const channel = client
      .channel('app-live-signals')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'live_signals' }, (payload) => {
        const row = payload.new as {
          domain?: string;
          action?: string;
          payload?: Record<string, unknown>;
          club?: string | null;
          profile_id?: string | null;
        };
        if (!row.domain || !row.action) return;
        emitLiveSignal({
          domain: row.domain,
          action: row.action,
          payload: row.payload ?? {},
          club: row.club ?? null,
          profile_id: row.profile_id ?? null,
        });
      })
      .subscribe();
    return () => {
      void client.removeChannel(channel);
    };
  }, []);
}

/** Abonnement checkout + compteur live (bus demarre dans AppRealtimeRoot). */
export function useAppRealtime(profileId: string | null | undefined) {
  const [checkoutStatus, setCheckoutStatus] = useState<CheckoutStatus | null>(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus | null>(null);
  const [liveTick, setLiveTick] = useState(0);

  useEffect(() => {
    return onLiveSignal(() => setLiveTick((n) => n + 1));
  }, []);

  useEffect(() => {
    const client = supabase;
    if (!profileId || !client) return undefined;
    const channel = client
      .channel(`commerce:${profileId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'checkout_sessions', filter: `profile_id=eq.${profileId}` },
        (payload) => {
          const row = payload.new as { status?: CheckoutStatus } | null;
          if (row?.status) setCheckoutStatus(row.status);
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'subscription_state', filter: `profile_id=eq.${profileId}` },
        (payload) => {
          const row = payload.new as { status?: SubscriptionStatus } | null;
          if (row?.status) setSubscriptionStatus(row.status);
        },
      )
      .subscribe();
    return () => {
      void client.removeChannel(channel);
    };
  }, [profileId]);

  return { checkoutStatus, subscriptionStatus, liveTick };
}

export function useLiveTick(): number {
  const [tick, setTick] = useState(0);
  useEffect(() => onLiveSignal(() => setTick((n) => n + 1)), []);
  return tick;
}
