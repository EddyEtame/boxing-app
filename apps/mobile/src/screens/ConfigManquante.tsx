import { View } from 'react-native';

import { useT } from '@/i18n';
import { Body, Display } from '@/ui/Text';
import { makeStyles, space } from '@/ui/theme';

/** Le build n'a pas recu les variables. Jamais de mode demonstration. */
export function ConfigManquante() {
  const T = useT();
  const s = useStyles();
  return (
    <View style={s.root}>
      <Display size="display3" tight>
        {T('config.title')}
      </Display>
      <Body tone="muted" style={s.body}>
        {T('config.body')}
      </Body>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  root: { flex: 1, backgroundColor: t.bg, justifyContent: 'center', paddingHorizontal: space[5], gap: space[3] },
  body: { marginTop: space[2] },
}));
