import { Linking } from 'react-native';

import { track } from '@/features/analytics';
import { urlBoutique } from '@/features/sections';
import type { ClubId } from '@/ui/theme';

/** Le catalogue de la boutique : le lien porte le club, et le clic se compte dans le back office. */
export function ouvrirOffres(club: ClubId | null | undefined, from: string) {
  track('offer_open', { from, value: 'catalogue' });
  void Linking.openURL(urlBoutique({ club: club ?? undefined }));
}
