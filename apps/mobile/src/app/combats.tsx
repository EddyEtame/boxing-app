import { Linking, View } from 'react-native';

import { COMBATS_PHOTO } from '@/data/combats';
import { useCombats } from '@/features/combats/useCombats';
import { shortDay } from '@/features/time';
import { useLocale, useT } from '@/i18n';
import { IconArrow } from '@/ui/icons';
import { Card } from '@/ui/kit';
import { Page, Reveal } from '@/ui/Page';
import { Photo } from '@/ui/Photo';
import { Tap } from '@/ui/Tap';
import { Body, Display } from '@/ui/Text';
import { GUTTER, makeStyles, radius, space, stroke, useTheme } from '@/ui/theme';

/**
 * Actualité des combats, boxe et MMA (CDC §13). Rubrique distincte, accessible à
 * tous. Chaque entrée dit sa source et sa date ; rien n'est réécrit par l'app.
 */
export default function CombatsScreen() {
  const T = useT();
  const s = useStyles();
  const t = useTheme();
  const lang = useLocale();
  const { items, origine, luA } = useCombats();
  return (
    <Page padded={false} bleedTop leading="back" tabBar={false}>
      <Photo source={COMBATS_PHOTO} style={s.hero} darken={0.48} scrim={0.82} scrimTop={0.4}>
        <View style={s.heroBottom}>
          <Body size="caption" weight="bold" eyebrow tone="muted">
            {T('fights.eyebrow')}
          </Body>
          <Display size="display2" tight>
            {T('fights.title')}
          </Display>
          <Body size="bodySmall" weight="semi" tone="muted">
            {origine === 'direct' ? T('fights.live', { h: luA ? luA.toTimeString().slice(0, 5) : '' }) : T('fights.snapshot')}
          </Body>
        </View>
      </Photo>

      <View style={s.body}>
        <Reveal>
          <Card padded={false} style={s.list}>
            {items.map((c, i) => (
              <Tap key={c.lien} onPress={() => void Linking.openURL(c.lien)} scaleTo={0.985} style={[s.row, i < items.length - 1 && { borderBottomWidth: stroke.hair, borderBottomColor: t.line }]} accessibilityRole="link" accessibilityLabel={c.titre}>
                <View style={s.rowBody}>
                  <Body size="caption" weight="bold" tone="dim">
                    {c.date ? shortDay(c.date, lang) : ''} · {c.source}
                    {lang === 'en' ? ` · ${T('fights.inFrench')}` : ''}
                  </Body>
                  <Body weight="bold">{c.titre}</Body>
                  {c.resume ? (
                    <Body size="bodySmall" tone="muted" numberOfLines={3}>
                      {c.resume}
                    </Body>
                  ) : null}
                </View>
                <IconArrow size={18} color={t.textDim} />
              </Tap>
            ))}
          </Card>
        </Reveal>
        <Body size="caption" tone="dim" style={s.note}>
          {T('fights.note')}
        </Body>
      </View>
    </Page>
  );
}

const useStyles = makeStyles((t) => ({
  hero: { height: 340, justifyContent: 'flex-end', borderBottomLeftRadius: radius.card + 6, borderBottomRightRadius: radius.card + 6 },
  heroBottom: { padding: GUTTER, paddingBottom: space[6], gap: space[1] },
  body: { paddingHorizontal: GUTTER, marginTop: space[5] },
  list: { paddingHorizontal: space[4], borderWidth: t.scheme === 'dark' ? stroke.hair : 0 },
  row: { flexDirection: 'row', alignItems: 'center', gap: space[3], paddingVertical: space[4] },
  rowBody: { flex: 1, gap: 4 },
  note: { marginTop: space[4] },
}));
