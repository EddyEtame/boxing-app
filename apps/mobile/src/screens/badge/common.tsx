import { router } from 'expo-router';
import { Linking, StyleSheet, View } from 'react-native';

import { clubById } from '@/data/clubs';
import type { Member } from '@/data/member';
import { useSession } from '@/state/session';
import { Page } from '@/ui/Page';
import { Photo } from '@/ui/Photo';
import { Tap } from '@/ui/Tap';
import { Body, Display, Mono } from '@/ui/Text';
import { color, ink, radius, space, stroke, whiteAlpha } from '@/ui/theme';

const BOUTIQUE = 'https://boutique.boxingcenter.fr/';

/**
 * Ce que le cahier des charges impose (§4) : pas de badge virtuel sans badge
 * physique enregistré sur la fiche Deciplus, et pas de badge sans abonnement
 * actif. En mode invité (§3A), l’écran reste un outil commercial : il montre la
 * porte, dit l’ordre des choses, et mène au compte et à la boutique.
 */
export function badgeLocked(member: Member): 'ok' | 'sans-badge' | 'restreint' | 'invite' {
  if (member.statut === 'invite') return 'invite';
  if (member.statut !== 'actif') return 'restreint';
  if (!member.badge.enregistre) return 'sans-badge';
  return 'ok';
}

type Reason = Exclude<ReturnType<typeof badgeLocked>, 'ok'>;

const STEPS: Record<Reason, { label: string; done: boolean }[]> = {
  invite: [
    { label: 'Prends ton abonnement, en ligne ou au club', done: false },
    { label: 'Achète ton badge physique à l’accueil : il est enregistré sur ta fiche', done: false },
    { label: 'Le code apparaît ici, lié à ton téléphone, et change à chaque round', done: false },
  ],
  'sans-badge': [
    { label: 'Ton abonnement est actif', done: true },
    { label: 'Achète ton badge physique à l’accueil : il est enregistré sur ta fiche', done: false },
    { label: 'Le code apparaît ici dès que le robot lit le badge sur ta fiche', done: false },
  ],
  restreint: [
    { label: 'Ton abonnement est terminé ; tes factures restent dans Moi', done: true },
    { label: 'Reprends un abonnement, en ligne ou au club', done: false },
    { label: 'Ton badge physique est gardé : le code revient ici aussitôt', done: false },
  ],
};

export function BadgeLockedView({ reason, member }: { reason: Reason; member: Member }) {
  const clubActif = useSession((s) => s.clubActif);
  const club = clubById(clubActif);
  const title = reason === 'sans-badge' ? 'Badge à enregistrer' : reason === 'restreint' ? 'Abonnement terminé' : 'Ta porte, dans ta poche';
  const lead =
    reason === 'sans-badge'
      ? 'Ton badge physique n’est pas encore sur ta fiche. Un passage à l’accueil, et ton code est ici.'
      : reason === 'restreint'
        ? 'Le badge revient avec l’abonnement. Rien n’est perdu : ta fiche et ton badge physique t’attendent.'
        : 'Les adhérents ouvrent la porte de leur club avec leur téléphone : un code qui change à chaque round, impossible à prêter.';
  return (
    <Page padded={false} bleedTop>
      <Photo source={club.photo} style={styles.hero} darken={0.5} scrim={0.8} scrimTop={0.3}>
        <View style={styles.heroTop}>
          <Mono size="micro" tone="text">
            MON BADGE · {club.court.toUpperCase()}
          </Mono>
          <Mono size="micro">{reason === 'invite' ? 'INVITÉ' : `Nº ${member.deciplusId}`}</Mono>
        </View>
        <View style={styles.heroBottom}>
          <Display size="display2" tight>
            {title}
          </Display>
          <Body tone="muted">{lead}</Body>
        </View>
      </Photo>

      <View style={styles.steps}>
        {STEPS[reason].map((s, i) => (
          <View key={s.label} style={styles.step}>
            <Mono size="caption" tone={s.done ? 'positive' : 'text'} style={styles.stepNo}>
              {s.done ? '✓' : String(i + 1).padStart(2, '0')}
            </Mono>
            <Body size="bodySmall" weight={s.done ? 'medium' : 'semi'} tone={s.done ? 'muted' : 'text'} style={styles.stepText}>
              {s.label}
            </Body>
          </View>
        ))}
      </View>

      <View style={styles.actions}>
        {reason === 'invite' ? (
          <>
            <Tap onPress={() => router.push('/connexion')} style={styles.main} accessibilityRole="button" accessibilityLabel="Créer mon compte">
              <Body weight="bold" tone="inverse">
                Créer mon compte
              </Body>
            </Tap>
            <Tap onPress={() => void Linking.openURL(BOUTIQUE)} style={styles.second} accessibilityRole="button" accessibilityLabel="Voir les abonnements">
              <Body weight="semi">Voir les abonnements</Body>
            </Tap>
          </>
        ) : reason === 'restreint' ? (
          <Tap onPress={() => void Linking.openURL(BOUTIQUE)} style={styles.main} accessibilityRole="button" accessibilityLabel="Reprendre un abonnement">
            <Body weight="bold" tone="inverse">
              Reprendre un abonnement
            </Body>
          </Tap>
        ) : (
          <Tap onPress={() => router.push('/planning')} style={styles.second} accessibilityRole="button" accessibilityLabel="Voir les horaires du club">
            <Body weight="semi">Les horaires de l’accueil</Body>
          </Tap>
        )}
        <Mono size="micro">LA VENTE DU BADGE PHYSIQUE RESTE LA RÈGLE · LE CODE N’EXISTE QU’APRÈS</Mono>
      </View>
    </Page>
  );
}

const styles = StyleSheet.create({
  hero: { height: 420, justifyContent: 'space-between' },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: space[4], paddingTop: space[7] },
  heroBottom: { padding: space[4], gap: space[2] },
  steps: { marginHorizontal: space[4], marginTop: space[4] },
  step: { flexDirection: 'row', alignItems: 'center', gap: space[3], paddingVertical: space[3], borderBottomWidth: stroke.hair, borderBottomColor: ink[200] },
  stepNo: { width: 28 },
  stepText: { flex: 1 },
  actions: { marginHorizontal: space[4], marginTop: space[5], gap: space[2] },
  main: { backgroundColor: color.text, borderRadius: radius.sm, paddingVertical: 13, alignItems: 'center' },
  second: { borderRadius: radius.sm, paddingVertical: 11, alignItems: 'center', borderWidth: stroke.thin, borderColor: whiteAlpha[12] },
});
