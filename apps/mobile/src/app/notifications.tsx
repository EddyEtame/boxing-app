import { useState } from 'react';
import { View } from 'react-native';

import { useT, type MessageKey } from '@/i18n';
import { Card, Toggle } from '@/ui/kit';
import { Page, Reveal } from '@/ui/Page';
import { Body } from '@/ui/Text';
import { makeStyles, radius, space, stroke, useTheme } from '@/ui/theme';

/**
 * Préférences de notifications (CDC §14). Les messages de la direction sont
 * essentiels et ne se coupent pas ; tout le reste se règle.
 */
type Pref = { id: string; label: MessageKey; sub: MessageKey; essential?: boolean };

const PREFS: Pref[] = [
  { id: 'direction', label: 'notif.direction', sub: 'notif.directionSub', essential: true },
  { id: 'coach', label: 'notif.coach', sub: 'notif.coachSub' },
  { id: 'events', label: 'notif.events', sub: 'notif.eventsSub' },
  { id: 'promos', label: 'notif.promos', sub: 'notif.promosSub' },
  { id: 'videos', label: 'notif.videos', sub: 'notif.videosSub' },
  { id: 'trainings', label: 'notif.trainings', sub: 'notif.trainingsSub' },
  { id: 'billing', label: 'notif.billing', sub: 'notif.billingSub' },
  { id: 'clubs', label: 'notif.clubs', sub: 'notif.clubsSub' },
];

export default function NotificationsScreen() {
  const T = useT();
  const s = useStyles();
  const t = useTheme();
  const [on, setOn] = useState<Record<string, boolean>>(() => Object.fromEntries(PREFS.map((p) => [p.id, true])));
  return (
    <Page title={T('notif.title')} subtitle={T('notif.sub')} leading="back" tabBar={false}>
      <Reveal>
        <Card padded={false} style={s.list}>
          {PREFS.map((p, i) => (
            <View key={p.id} style={[s.row, i < PREFS.length - 1 && { borderBottomWidth: stroke.hair, borderBottomColor: t.line }]}>
              <View style={{ flex: 1, gap: 2 }}>
                <Body weight="semi">{T(p.label)}</Body>
                <Body size="caption" tone="muted">
                  {T(p.sub)}
                </Body>
                {p.essential ? (
                  <View style={[s.essential, { backgroundColor: t.tint }]}>
                    <Body size="caption" weight="bold" tone="muted">
                      {T('notif.essential')}
                    </Body>
                  </View>
                ) : null}
              </View>
              <Toggle value={p.essential ? true : on[p.id]} disabled={p.essential} onChange={(v) => setOn((st) => ({ ...st, [p.id]: v }))} label={T(p.label)} />
            </View>
          ))}
        </Card>
      </Reveal>
      <Body size="caption" tone="dim" style={s.note}>
        {T('notif.note')}
      </Body>
    </Page>
  );
}

const useStyles = makeStyles((t) => ({
  list: { paddingHorizontal: space[4], borderWidth: t.scheme === 'dark' ? stroke.hair : 0 },
  row: { flexDirection: 'row', alignItems: 'center', gap: space[3], minHeight: 72, paddingVertical: space[4] },
  essential: { alignSelf: 'flex-start', marginTop: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill },
  note: { marginTop: space[4] },
}));
