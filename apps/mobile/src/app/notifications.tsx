import { isNotifEssential, NOTIF_OPTIONAL, NOTIF_TYPES } from '@bc/contract';
import { View } from 'react-native';

import { useT } from '@/i18n';
import { usePrefs } from '@/state/prefs';
import { IconCheck } from '@/ui/icons';
import { Card, Section, Toggle } from '@/ui/kit';
import { Page, Reveal } from '@/ui/Page';
import { Body } from '@/ui/Text';
import { makeStyles, space, stroke, useTheme } from '@/ui/theme';

/** Ce qui arrive toujours, dans l'ordre du CDC §14. */
const ALWAYS = NOTIF_TYPES.filter(isNotifEssential);

/**
 * Préférences de notifications (CDC §14), sur les dix types du contrat partagé
 * avec l'admin. Seules les offres et les nouvelles vidéos se coupent (Eddy,
 * 24/10/2026) : deux vrais interrupteurs en tête, puis ce qui reste actif, en
 * liste cochée plutôt qu'en interrupteurs grisés qui feraient croire à un choix.
 */
export default function NotificationsScreen() {
  const T = useT();
  const s = useStyles();
  const t = useTheme();
  const notif = usePrefs((st) => st.notif);
  const setNotif = usePrefs((st) => st.setNotif);
  return (
    <Page title={T('notif.title')} subtitle={T('notif.sub')} leading="back" tabBar={false}>
      <Reveal>
        <Section title={T('notif.optional')}>
          <Card padded={false} style={s.list}>
            {NOTIF_OPTIONAL.map((type, i) => (
              <View key={type} style={[s.row, i < NOTIF_OPTIONAL.length - 1 && { borderBottomWidth: stroke.hair, borderBottomColor: t.line }]}>
                <View style={s.text}>
                  <Body weight="semi">{T(`notif.types.${type}.label`)}</Body>
                  <Body size="caption" tone="muted">
                    {T(`notif.types.${type}.sub`)}
                  </Body>
                </View>
                <Toggle value={notif[type] !== false} onChange={(v) => setNotif(type, v)} label={T(`notif.types.${type}.label`)} />
              </View>
            ))}
          </Card>
        </Section>
      </Reveal>

      <Reveal>
        <Section title={T('notif.always')} note={T('notif.alwaysNote')}>
          <Card padded={false} style={s.list}>
            {ALWAYS.map((type, i) => (
              <View key={type} style={[s.rowAlways, i < ALWAYS.length - 1 && { borderBottomWidth: stroke.hair, borderBottomColor: t.line }]} accessibilityLabel={`${T(`notif.types.${type}.label`)}, ${T('notif.always').toLowerCase()}`}>
                <View style={[s.check, { backgroundColor: t.tint }]}>
                  <IconCheck size={14} color={t.text} strokeWidth={2.4} />
                </View>
                <View style={s.text}>
                  <Body size="bodySmall" weight="semi">
                    {T(`notif.types.${type}.label`)}
                  </Body>
                  <Body size="caption" tone="muted">
                    {T(`notif.types.${type}.sub`)}
                  </Body>
                </View>
              </View>
            ))}
          </Card>
        </Section>
      </Reveal>
    </Page>
  );
}

const useStyles = makeStyles((t) => ({
  list: { paddingHorizontal: space[4], borderWidth: t.scheme === 'dark' ? stroke.hair : 0 },
  row: { flexDirection: 'row', alignItems: 'center', gap: space[3], minHeight: 72, paddingVertical: space[4] },
  rowAlways: { flexDirection: 'row', alignItems: 'center', gap: space[3], paddingVertical: space[3] },
  text: { flex: 1, gap: 2 },
  check: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
}));
