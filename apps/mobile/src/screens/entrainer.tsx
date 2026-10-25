import { useState } from 'react';
import { View } from 'react-native';

import { useT } from '@/i18n';
import { selectStatut, useSession } from '@/state/session';
import { IconPlay, IconUsers } from '@/ui/icons';
import { Segmented } from '@/ui/kit';
import { Page, Reveal } from '@/ui/Page';
import { Bientot } from '@/ui/Soon';
import { makeStyles, space } from '@/ui/theme';

type Vue = 'videos' | 'membres';

/** Videos et seances entre membres : la rubrique reste, le contenu n'est pas invente. */
export function Screen() {
  const T = useT();
  const s = useStyles();
  const statut = useSession(selectStatut);
  const [vue, setVue] = useState<Vue>('videos');
  return (
    <Page title={T('train.title')} subtitle={statut === 'invite' ? T('train.subVideos') : vue === 'videos' ? T('train.subVideos') : T('train.subMembers')}>
      <Reveal>
        <Segmented<Vue>
          full
          value={vue}
          onChange={setVue}
          options={[
            { value: 'videos', label: T('train.videos'), icon: IconPlay },
            { value: 'membres', label: T('train.members'), icon: IconUsers },
          ]}
        />
      </Reveal>
      <Reveal>
        <View style={s.block}>
          <Bientot />
        </View>
      </Reveal>
    </Page>
  );
}

const useStyles = makeStyles(() => ({
  block: { marginTop: space[5] },
}));
