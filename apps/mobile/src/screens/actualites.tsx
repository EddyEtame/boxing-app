import { router } from 'expo-router';
import { View } from 'react-native';

import { useT } from '@/i18n';
import { IconBelt } from '@/ui/icons';
import { Card, Row, Section } from '@/ui/kit';
import { Page, Reveal } from '@/ui/Page';
import { Bientot } from '@/ui/Soon';
import { makeStyles, space, stroke } from '@/ui/theme';

/** Actualites du club : rien n'est invente. Les combats restent, ils viennent du flux reel. */
export function Screen() {
  const T = useT();
  const s = useStyles();
  return (
    <Page title={T('news.title')} subtitle={T('news.sub')}>
      <Reveal>
        <Bientot />
      </Reveal>
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
