import { track } from '@/features/analytics';
import { urlBoutique } from '@/features/sections';
import { ouvrirDansApp } from '@/lib/in-app-browser';
import type { ClubId } from '@/ui/theme';

/** Le catalogue de la boutique, dans le navigateur de l'app. */
export function ouvrirOffres(club: ClubId | null | undefined, from: string) {
  track('offer_open', { from, value: 'catalogue' });
  void ouvrirDansApp(urlBoutique({ club: club ?? undefined }));
}
