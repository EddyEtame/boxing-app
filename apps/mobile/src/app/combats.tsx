import { useState } from 'react';
import { Image, Linking, View } from 'react-native';

import { COMBATS_SOURCES, type IdSourceCombats } from '@/data/combats';
import { useCombats } from '@/features/combats/useCombats';
import { shortDay } from '@/features/time';
import { useLocale, useT } from '@/i18n';
import { configReady } from '@/lib/config';
import { IconArrow } from '@/ui/icons';
import { Card, Chip } from '@/ui/kit';
import { Page, Reveal } from '@/ui/Page';
import { Photo } from '@/ui/Photo';
import { Tap } from '@/ui/Tap';
import { Body, Display } from '@/ui/Text';
import { GUTTER, makeStyles, radius, space, stroke, useTheme } from '@/ui/theme';

const COMBATS_PHOTO = require('@/assets/photos/gala-impact.jpg');

/**
 * Les publications du club précèdent la presse dans la vue complète (CDC §13).
 */
export default function CombatsScreen() {
  const T = useT();
  const s = useStyles();
  const t = useTheme();
  const lang = useLocale();
  const { items, lectures } = useCombats();
  const [source, setSource] = useState<IdSourceCombats | null>(null);
  const visibles = source ? items.filter((article) => article.source === source) : items;
  const dates = Object.values(lectures);
  const luA = source ? lectures[source] : dates.sort((a, b) => b.getTime() - a.getTime())[0];
  const statut = !luA ? T('fights.snapshot') : !source && dates.length < COMBATS_SOURCES.length ? T('fights.mixed') : T('fights.live', { h: luA.toTimeString().slice(0, 5) });
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
            {statut}
          </Body>
        </View>
      </Photo>

      <View style={s.body}>
        <View style={s.sources}>
          <Chip label={T('fights.allSources')} selected={source === null} onPress={() => setSource(null)} />
          {COMBATS_SOURCES.map(({ id, nom }) => (
            <Chip key={id} label={nom} selected={source === id} onPress={() => setSource(id)} />
          ))}
        </View>
        <Reveal>
          <Card padded={false} style={s.list}>
            {visibles.map((c, i) => (
              <Tap key={c.id} disabled={!configReady || !c.lien} onPress={() => void Linking.openURL(c.lien)} scaleTo={0.985} style={[s.row, i < visibles.length - 1 && { borderBottomWidth: stroke.hair, borderBottomColor: t.line }]} accessibilityRole={configReady && c.lien ? 'link' : 'text'} accessibilityLabel={c.titre}>
                {c.photo ? <Image source={{ uri: c.photo }} style={s.thumb} /> : null}
                <View style={s.rowBody}>
                  <Body size="caption" weight="bold" tone="dim">
                    {[c.date && shortDay(c.date, lang), c.source, lang === 'en' && !c.duClub && T('fights.inFrench')].filter(Boolean).join(' · ')}
                  </Body>
                  <Body weight="bold">{c.titre}</Body>
                  {c.resume ? (
                    <Body size="bodySmall" tone="muted" numberOfLines={3}>
                      {c.resume}
                    </Body>
                  ) : null}
                </View>
                {configReady && c.lien ? <IconArrow size={18} color={t.textDim} /> : null}
              </Tap>
            ))}
          </Card>
        </Reveal>
        {configReady && <Body size="caption" tone="dim" style={s.note}>{T('fights.note')}</Body>}
      </View>
    </Page>
  );
}

const useStyles = makeStyles((t) => ({
  hero: { height: 340, justifyContent: 'flex-end', borderBottomLeftRadius: radius.card + 6, borderBottomRightRadius: radius.card + 6 },
  heroBottom: { padding: GUTTER, paddingBottom: space[6], gap: space[1] },
  body: { paddingHorizontal: GUTTER, marginTop: space[5] },
  sources: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2], marginBottom: space[4] },
  list: { paddingHorizontal: space[4], borderWidth: t.scheme === 'dark' ? stroke.hair : 0 },
  row: { flexDirection: 'row', alignItems: 'center', gap: space[3], paddingVertical: space[4] },
  rowBody: { flex: 1, gap: 4 },
  thumb: { width: 72, height: 72, borderRadius: 8 },
  note: { marginTop: space[4] },
}));
