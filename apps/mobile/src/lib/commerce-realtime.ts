import type { CheckoutStatus, SubscriptionStatus } from '@bc/contract';
import { useEffect, useState } from 'react';

import { supabase } from '@/lib/supabase';

export function useCommerceRealtime(profileId: string | null | undefined) {
  const [checkoutStatus, setCheckoutStatus] = useState<CheckoutStatus | null>(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus | null>(null);

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

  return { checkoutStatus, subscriptionStatus };
}
