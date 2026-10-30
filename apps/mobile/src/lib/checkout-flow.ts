import type { CheckoutSessionView } from '@bc/contract';
import * as WebBrowser from 'expo-web-browser';

import { creerSessionCheckout, lireSessionCheckout } from '@/lib/api';
import { configReady } from '@/lib/config';
import type { ClubId } from '@/ui/theme';

export const DEFAULT_OFFER_SLUG = 'adulte-mensuel';

export async function ouvrirCheckoutBoutique(offerSlug: string, club: ClubId): Promise<CheckoutSessionView | null> {
  if (!configReady) return null;
  const session = await creerSessionCheckout({ offerSlug, club });
  await WebBrowser.openBrowserAsync(session.checkoutUrl, {
    presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN,
  });
  return lireSessionCheckout(session.id);
}
