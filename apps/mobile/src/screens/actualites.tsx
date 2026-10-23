import { router } from 'expo-router';
import { Linking, useWindowDimensions, View } from 'react-native';

import { clubById } from '@/data/clubs';
import { NEWS, type NewsItem } from '@/data/news';
import { shortDay } from '@/features/time';
import { useInLocale, useLocale, useT } from '@/i18n';
import { useProfil } from '@/state/session';
import { IconBelt } from '@/ui/icons';
import { Card, Row, Section } from '@/ui/kit';
import { Page, Reveal } from '@/ui/Page';
import { GUTTER, makeStyles, MAX_CONTENT_WIDTH, space, stroke } from '@/ui/theme';

import { NewsRow, Poster } from './home/parts';

/**
 * Actualités et événements (CDC §8), accessibles à tous. L'invité voit ce qui
 * est public ; l'adhérent voit tout. L'actualité des combats (§13) est à côté.
 */
export function Screen() {
  const T = useT();
  const s = useStyles();
  const lang = useLocale();
  const profil = useProfil();
  const { width } = useWindowDimensions();
  const col = Math.min(width, MAX_CONTENT_WIDTH) - GUTTER * 2;
  const loc = useInLocale();
  const items = NEWS.filter((n) => profil === 'adherent' || n.publique).map(loc);
  const [first, ...rest] = items;
  const kind = (n: NewsItem) => T(`news.kind.${n.kind}`);

  return (
    <Page title={T('news.title')} subtitle={T('news.sub')}>
      {first ? (
        <Reveal>
          <Poster
            index={0}
            height={Math.round(col * 1.05)}
            photo={first.photo}
            cornerLeft={kind(first)}
            cornerRight={shortDay(first.date, lang)}
            title={first.titre}
            meta={`${kind(first).toUpperCase()}${first.club ? ' · ' + clubById(first.club).court.toUpperCase() : ''}`}
            sub={first.accroche}
            onPress={first.lien ? () => void Linking.openURL(first.lien!) : undefined}
          />
        </Reveal>
      ) : null}

      {rest.length ? (
        <Reveal>
          <Section title={T('news.more')}>
            <Card padded={false} style={s.list}>
              {rest.map((n, i) => (
                <NewsRow key={n.id} item={n} last={i === rest.length - 1} onPress={n.lien ? () => void Linking.openURL(n.lien!) : undefined} />
              ))}
            </Card>
          </Section>
        </Reveal>
      ) : null}

      <Reveal>
        <Section title={T('news.fights')}>
          <Card padded={false} style={s.list}>
            <View>
              <Row icon={IconBelt} iconTone="accent" title={T('sections.fights')} subtitle={T('sections.fightsSub')} onPress={() => router.push('/combats')} last />
            </View>
          </Card>
        </Section>
      </Reveal>
    </Page>
  );
}

const useStyles = makeStyles((t) => ({
  list: { paddingHorizontal: space[5], borderWidth: t.scheme === 'dark' ? stroke.hair : 0 },
}));
