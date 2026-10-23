import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';

import { CLUBS, clubById } from '@/data/clubs';
import { PERSONNES, type Personne } from '@/data/coachs';
import { useInLocale, useT } from '@/i18n';
import { Button, Card, Chip, Section } from '@/ui/kit';
import { Page, Reveal } from '@/ui/Page';
import { Photo } from '@/ui/Photo';
import { Body, Display, Heading } from '@/ui/Text';
import { GUTTER, makeStyles, radius, space, stroke, useTheme, type ClubId } from '@/ui/theme';

/**
 * Les coachs et les boxeurs (CDC §3A « portraits et reportages »). Un portrait,
 * ce qu'il enseigne ou ce qu'il a gagné, le club. Jamais son emploi du temps.
 */
export default function EquipeScreen() {
  const T = useT();
  const s = useStyles();
  const [club, setClub] = useState<ClubId | 'tous'>('tous');
  const liste = PERSONNES.filter((p) => club === 'tous' || p.clubs.includes(club));
  const coachs = liste.filter((p) => p.type === 'coach');
  const boxeurs = liste.filter((p) => p.type === 'boxeur');
  return (
    <Page title={T('team.title')} subtitle={T('team.sub')} leading="back" tabBar={false}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.chipsScroll} contentContainerStyle={s.chips}>
        {(['tous', ...CLUBS.map((c) => c.id)] as const).map((id) => (
          <Chip key={id} label={id === 'tous' ? T('team.all') : clubById(id).court} selected={id === club} onPress={() => setClub(id)} />
        ))}
      </ScrollView>

      {boxeurs.length ? (
        <Section title={T('team.boxers', { n: boxeurs.length })}>
          <Card padded={false} style={s.list}>
            {boxeurs.map((p, i) => (
              <Portrait key={p.id} p={p} last={i === boxeurs.length - 1} />
            ))}
          </Card>
        </Section>
      ) : null}
      {coachs.length ? (
        <Section title={T('team.coaches', { n: coachs.length })}>
          <Card padded={false} style={s.list}>
            {coachs.map((p, i) => (
              <Portrait key={p.id} p={p} last={i === coachs.length - 1} />
            ))}
          </Card>
        </Section>
      ) : null}
      {liste.length === 0 ? (
        <Card style={s.empty}>
          <Display size="display4" tight tone="dim">
            {T('team.soon')}
          </Display>
          <Body tone="muted">{T('team.soonBody')}</Body>
          <Button small label={T('team.planning')} onPress={() => router.navigate('/planning')} style={s.emptyCta} />
        </Card>
      ) : (
        <Body size="caption" tone="dim" style={s.note}>
          {T('team.note')}
        </Body>
      )}
    </Page>
  );
}

function Portrait({ p: source, last }: { p: Personne; last: boolean }) {
  const s = useStyles();
  const t = useTheme();
  const p = useInLocale()(source);
  const clubs = p.clubs.map((c) => clubById(c).court).join(' · ');
  return (
    <Reveal>
      <View style={[s.card, !last && { borderBottomWidth: stroke.hair, borderBottomColor: t.line }]}>
        {p.photo ? (
          <Photo source={p.photo} style={s.photo} darken={0.08} scrim={0} vignette={false} grain={false} contentPosition="top" />
        ) : (
          <View style={[s.photo, s.initials, { backgroundColor: t.cardAlt }]}>
            <Display size="display3" tight tone="dim">
              {p.initiales}
            </Display>
          </View>
        )}
        <View style={s.body}>
          {p.tag ? (
            <View style={[s.tag, { backgroundColor: t.accentSoft }]}>
              <Body size="caption" weight="bold" tone="accent" numberOfLines={1}>
                {p.tag}
              </Body>
            </View>
          ) : null}
          <Heading level="section" numberOfLines={2}>
            {p.nom}
          </Heading>
          <Body size="bodySmall" weight="semi">
            {p.role}
          </Body>
          {p.note ? (
            <Body size="caption" tone="muted">
              {p.note}
            </Body>
          ) : null}
          <Body size="caption" weight="bold" tone="dim">
            {clubs}
          </Body>
        </View>
      </View>
    </Reveal>
  );
}

const useStyles = makeStyles((t) => ({
  chipsScroll: { flexGrow: 0, marginHorizontal: -GUTTER },
  chips: { paddingHorizontal: GUTTER, gap: space[2] },
  list: { paddingHorizontal: space[4], borderWidth: t.scheme === 'dark' ? stroke.hair : 0 },
  card: { flexDirection: 'row', gap: space[4], paddingVertical: space[4] },
  photo: { width: 104, height: 136, borderRadius: radius.tile },
  initials: { alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1, gap: 4, justifyContent: 'center' },
  tag: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill },
  empty: { marginTop: space[6], gap: space[2] },
  emptyCta: { alignSelf: 'flex-start', marginTop: space[2] },
  note: { marginTop: space[5] },
}));
