import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { CLUBS, clubById } from '@/data/clubs';
import { PERSONNES, type Personne } from '@/data/coachs';
import { IconClose } from '@/ui/icons';
import { Page } from '@/ui/Page';
import { Photo } from '@/ui/Photo';
import { Tap } from '@/ui/Tap';
import { Body, Display, Mono } from '@/ui/Text';
import { color, ink, radius, space, stroke, whiteAlpha, type ClubId } from '@/ui/theme';

/**
 * Les coachs et les boxeurs (CDC §3A « portraits et reportages »). Un portrait,
 * ce qu’il enseigne ou ce qu’il a gagné, le club. Jamais son emploi du temps.
 */
export default function EquipeScreen() {
  const [club, setClub] = useState<ClubId | 'tous'>('tous');
  const liste = PERSONNES.filter((p) => club === 'tous' || p.clubs.includes(club));
  const coachs = liste.filter((p) => p.type === 'coach');
  const boxeurs = liste.filter((p) => p.type === 'boxeur');
  return (
    <Page padded={false}>
      <View style={styles.head}>
        <View style={{ flex: 1, gap: 2 }}>
          <Body size="caption" eyebrow tone="muted">
            Les coachs et les boxeurs
          </Body>
          <Display size="display3" tight>
            Ceux qui tiennent la salle
          </Display>
        </View>
        <Pressable onPress={() => router.back()} style={styles.close} accessibilityRole="button" accessibilityLabel="Fermer">
          <IconClose size={20} color={color.text} />
        </Pressable>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll} contentContainerStyle={styles.chips}>
        {(['tous', ...CLUBS.map((c) => c.id)] as const).map((id) => {
          const on = id === club;
          return (
            <Tap key={id} onPress={() => setClub(id)} scaleTo={0.95} haptic="selection" style={[styles.chip, on && styles.chipOn]} accessibilityRole="button" accessibilityState={{ selected: on }}>
              <Body size="caption" weight="bold" caps tone={on ? 'inverse' : 'muted'}>
                {id === 'tous' ? 'Tous' : clubById(id).court}
              </Body>
            </Tap>
          );
        })}
      </ScrollView>

      {boxeurs.length ? (
        <>
          <SectionHead left="LES BOXEURS" right={`${boxeurs.length}`} />
          {boxeurs.map((p) => (
            <Portrait key={p.id} p={p} />
          ))}
        </>
      ) : null}
      {coachs.length ? (
        <>
          <SectionHead left="LES COACHS" right={`${coachs.length}`} />
          {coachs.map((p) => (
            <Portrait key={p.id} p={p} />
          ))}
        </>
      ) : null}
      {liste.length === 0 ? (
        <View style={styles.empty}>
          <Display size="display4" tight tone="dim">
            Portraits en cours
          </Display>
          <Body size="bodySmall" tone="muted">
            Les coachs de ce club arrivent ici avec leur photo. Leurs cours, eux, sont déjà dans le planning.
          </Body>
          <Tap onPress={() => router.push('/planning')} style={styles.emptyCta} accessibilityRole="button" accessibilityLabel="Voir le planning">
            <Body size="caption" weight="bold" caps tone="inverse">
              Voir le planning
            </Body>
          </Tap>
        </View>
      ) : (
        <Body size="caption" tone="dim" style={styles.note}>
          Qui enseigne quoi, et où. Quand : dans le planning. Les emplois du temps des coachs restent au club.
        </Body>
      )}
    </Page>
  );
}

function SectionHead({ left, right }: { left: string; right: string }) {
  return (
    <View style={styles.sectionHead}>
      <Mono size="micro">{left}</Mono>
      <Mono size="micro">{right}</Mono>
    </View>
  );
}

function Portrait({ p }: { p: Personne }) {
  const clubs = p.clubs.map((c) => clubById(c).court.toUpperCase()).join(' · ');
  return (
    <View style={styles.card}>
      {p.photo ? (
        <Photo source={p.photo} style={styles.photo} darken={0.15} scrim={0} vignette={false} grain={false} contentPosition="top" />
      ) : (
        <View style={[styles.photo, styles.initials]}>
          <Display size="display2" tight tone="dim">
            {p.initiales}
          </Display>
        </View>
      )}
      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Display size="display5" tight>
            {p.nom}
          </Display>
          {p.tag ? <Mono size="micro">{p.tag.toUpperCase()}</Mono> : null}
        </View>
        <Body size="bodySmall" weight="semi">
          {p.role}
        </Body>
        {p.note ? (
          <Body size="caption" tone="muted">
            {p.note}
          </Body>
        ) : null}
        <Mono size="micro" tone="dim">
          {clubs}
        </Mono>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: space[3], paddingHorizontal: space[4], marginBottom: space[3] },
  close: { width: 40, height: 40, borderRadius: radius.pill, backgroundColor: whiteAlpha[8], alignItems: 'center', justifyContent: 'center' },
  chipsScroll: { flexGrow: 0 },
  chips: { paddingHorizontal: space[4], gap: space[2], paddingBottom: space[2], alignItems: 'center' },
  chip: { paddingHorizontal: space[3], paddingVertical: 8, borderRadius: radius.sm, borderWidth: stroke.thin, borderColor: ink[300] },
  chipOn: { backgroundColor: color.text, borderColor: color.text },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', marginHorizontal: space[4], marginTop: space[5], paddingBottom: space[2], borderBottomWidth: stroke.hair, borderBottomColor: ink[300] },
  card: { flexDirection: 'row', gap: space[3], marginHorizontal: space[4], paddingVertical: space[3], borderBottomWidth: stroke.hair, borderBottomColor: ink[200] },
  photo: { width: 96, height: 128, borderRadius: radius.xs },
  initials: { backgroundColor: ink[150], alignItems: 'center', justifyContent: 'center', borderWidth: stroke.hair, borderColor: whiteAlpha[6] },
  body: { flex: 1, gap: 3, justifyContent: 'center' },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: space[2] },
  note: { marginHorizontal: space[4], marginTop: space[4] },
  empty: { marginHorizontal: space[4], marginTop: space[6], gap: space[2], alignItems: 'flex-start' },
  emptyCta: { marginTop: space[2], backgroundColor: color.text, borderRadius: radius.sm, paddingHorizontal: space[4], paddingVertical: 12 },
});
