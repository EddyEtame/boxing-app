import { router } from 'expo-router';
import { View } from 'react-native';

import { useT } from '@/i18n';
import { Button } from '@/ui/kit';
import { Bientot } from '@/ui/Soon';
import { Body } from '@/ui/Text';
import { makeStyles, space } from '@/ui/theme';

/** Un fil de discussion. Le serveur ne livre pas encore les messages. */
export default function ThreadScreen() {
  const T = useT();
  const s = useStyles();
  return (
    <View style={s.root}>
      <Bientot />
      <Body tone="muted" style={s.note}>
        {T('messages.notFound')}
      </Body>
      <Button label={T('common.back')} variant="secondary" onPress={() => (router.canGoBack() ? router.back() : router.replace('/messages'))} style={s.back} />
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  root: { flex: 1, backgroundColor: t.bg, justifyContent: 'center', paddingHorizontal: space[5], gap: space[4] },
  note: { textAlign: 'center' },
  back: { marginTop: space[2] },
}));
