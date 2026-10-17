import { StyleSheet, View } from 'react-native';

import type { Member } from '@/data/member';
import { IconLock } from '@/ui/icons';
import { Page } from '@/ui/Page';
import { Body, Display, Mono } from '@/ui/Text';
import { color, ink, radius, space, whiteAlpha } from '@/ui/theme';

/**
 * Ce que le cahier des charges impose (§4) : pas de badge virtuel sans badge
 * physique enregistré sur la fiche Deciplus, et pas de badge sans abonnement
 * actif. Les trois directions partagent cet état verrouillé.
 */
export function badgeLocked(member: Member): 'ok' | 'sans-badge' | 'restreint' | 'invite' {
  if (member.statut === 'invite') return 'invite';
  if (member.statut !== 'actif') return 'restreint';
  if (!member.badge.enregistre) return 'sans-badge';
  return 'ok';
}

export function BadgeLockedView({ reason, member }: { reason: Exclude<ReturnType<typeof badgeLocked>, 'ok'>; member: Member }) {
  const title = reason === 'sans-badge' ? 'Badge à enregistrer' : reason === 'restreint' ? 'Abonnement terminé' : 'Réservé aux adhérents';
  const body =
    reason === 'sans-badge'
      ? `Ton badge physique n’est pas encore enregistré sur ta fiche. Passe à l’accueil de ton club : dès qu’il l’est, ton code apparaît ici.`
      : reason === 'restreint'
        ? `Ton abonnement est terminé. Tes factures restent disponibles dans Moi. Pour reprendre, la boutique est à un geste.`
        : `Crée ton compte adhérent pour retrouver ton badge, ton abonnement et tes séances.`;
  return (
    <Page scroll={false} contentStyle={styles.lockedContent}>
      <View style={styles.lockedPlate}>
        <View style={styles.lockIcon}>
          <IconLock size={28} color={color.textMuted} />
        </View>
        <Display size="display4" tight>
          {title}
        </Display>
        <Body tone="muted">{body}</Body>
        <Mono size="micro">
          {member.prenom.toUpperCase()} {member.nom.toUpperCase()} · {reason === 'invite' ? 'MODE INVITÉ' : `Nº ${member.deciplusId}`}
        </Mono>
      </View>
    </Page>
  );
}

const styles = StyleSheet.create({
  lockedContent: { justifyContent: 'center' },
  lockedPlate: { backgroundColor: ink[150], borderRadius: radius.sm, borderWidth: 1, borderColor: whiteAlpha[6], padding: space[6], gap: space[3] },
  lockIcon: { width: 48, height: 48, borderRadius: radius.sm, backgroundColor: whiteAlpha[6], alignItems: 'center', justifyContent: 'center', marginBottom: space[2] },
});
