import { TabList, TabSlot, TabTrigger, Tabs } from 'expo-router/ui';
import { StyleSheet, View } from 'react-native';

import { useT } from '@/i18n';
import { IconBadge, IconBag, IconMe, IconPlanning, IconRing } from '@/ui/icons';
import { ProfileSwitch } from '@/ui/ProfileSwitch';
import { TabBarFrame, TabItem } from '@/ui/TabBar';
import { color } from '@/ui/theme';

export default function TabsLayout() {
  const t = useT();
  return (
    <View style={styles.root}>
      <Tabs>
        <TabSlot />
        <TabList asChild>
          <TabBarFrame>
            <TabTrigger name="home" href="/" asChild>
              <TabItem id="home" icon={IconRing} label={t('tabs.home')} />
            </TabTrigger>
            <TabTrigger name="planning" href="/planning" asChild>
              <TabItem id="planning" icon={IconPlanning} label={t('tabs.planning')} />
            </TabTrigger>
            <TabTrigger name="badge" href="/badge" asChild>
              <TabItem id="badge" icon={IconBadge} label={t('tabs.badge')} />
            </TabTrigger>
            <TabTrigger name="entrainer" href="/entrainer" asChild>
              <TabItem id="entrainer" icon={IconBag} label={t('tabs.train')} />
            </TabTrigger>
            <TabTrigger name="moi" href="/moi" asChild>
              <TabItem id="moi" icon={IconMe} label={t('tabs.me')} />
            </TabTrigger>
          </TabBarFrame>
        </TabList>
      </Tabs>
      <ProfileSwitch />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.bg },
});
