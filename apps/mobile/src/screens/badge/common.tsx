import { router } from 'expo-router';
import { Linking, StyleSheet, View } from 'react-native';

import type { Member } from '@/data/member';
import { IconLock } from '@/ui/icons';
import { Page } from '@/ui/Page';
import { Tap } from '@/ui/Tap';
import { Body, Display, Mono } from '@/ui/Text';
import { color, ink, radius, space, stroke, whiteAlpha } from '@/ui/theme';

const BOUTIQUE = 'https://boutique.boxingcenter.fr/';

/**
 * Ce que le cahier des charges impose (§4) : pas de badge virtuel sans badge
 * physique enregistré sur la fiche Deciplus, et pas de badge sans abonnement
 * actif. En mode invité (§3A), l’écran reste un outil commercial : il mène au
 * compte et à la boutique.
 */
export function badgeLocked(member: Member): 'ok' | 'sans-badge' | 'restreint' | 'invite' {
  if (member.statut === 'invite') return 'invite';
  if (member.statut !== 'actif') return 'restreint';
  if (!member.badge.enregistre) return 'sans-badge';
  return 'ok';
}

export function BadgeLockedView({ reason, member }: { reason: Exclude<ReturnType<typeof badgeLocked>, 'ok'>; member: Member }) {
  const title = reason === 'sans-badge' ? 'Badge à enregistrer' : reason === 'restreint' ? 'Abonnement terminé' : 'Ton badge, dans ta poche';
  const body =
    reason === 'sans-badge'
      ? `Ton badge physique n’est pas encore enregistré sur ta fiche. Passe à l’accueil de ton club : dès qu’il l’est, ton code apparaît ici.`
      : reason === 'restreint'
        ? `Ton abonnement est terminé. Tes factures restent disponibles dans Moi. Pour reprendre, la boutique est à un geste.`
        : `Les adhérents ouvrent la porte de leur club avec leur téléphone : un code qui change à chaque round, impossible à prêter. Crée ton compte, ou prends ton abonnement.`;
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
        {reason === 'invite' ? (
          <View style={styles.actions}>
            <Tap onPress={() => router.push('/connexion')} style={styles.main} accessibilityRole="button" accessibilityLabel="Créer mon compte">
              <Body weight="bold" tone="inverse">
                Créer mon compte
              </Body>
            </Tap>
            <Tap onPress={() => void Linking.openURL(BOUTIQUE)} style={styles.second} accessibilityRole="button" accessibilityLabel="Voir les abonnements">
              <Body weight="semi">Voir les abonnements</Body>
            </Tap>
            <Mono size="micro">LE BADGE PHYSIQUE S’ACHÈTE À L’ACCUEIL DU CLUB · LE CODE ARRIVE ENSUITE ICI</Mono>
          </View>
        ) : reason === 'restreint' ? (
          <View style={styles.actions}>
            <Tap onPress={() => void Linking.openURL(BOUTIQUE)} style={styles.main} accessibilityRole="button" accessibilityLabel="Reprendre un abonnement">
              <Body weight="bold" tone="inverse">
                Reprendre un abonnement
              </Body>
            </Tap>
            <Mono size="micro">
              {member.prenom.toUpperCase()} {member.nom.toUpperCase()} · Nº {member.deciplusId}
            </Mono>
          </View>
        ) : (
          <Mono size="micro">
            {member.prenom.toUpperCase()} {member.nom.toUpperCase()} · Nº {member.deciplusId}
          </Mono>
        )}
      </View>
    </Page>
  );
}

const styles = StyleSheet.create({
  lockedContent: { justifyContent: 'center' },
  lockedPlate: { backgroundColor: ink[150], borderRadius: radius.sm, borderWidth: 1, borderColor: whiteAlpha[6], padding: space[6], gap: space[3] },
  lockIcon: { width: 48, height: 48, borderRadius: radius.sm, backgroundColor: whiteAlpha[6], alignItems: 'center', justifyContent: 'center', marginBottom: space[2] },
  actions: { gap: space[2], marginTop: space[2] },
  main: { backgroundColor: color.text, borderRadius: radius.sm, paddingVertical: 13, alignItems: 'center' },
  second: { borderRadius: radius.sm, paddingVertical: 11, alignItems: 'center', borderWidth: stroke.thin, borderColor: whiteAlpha[12] },
});
