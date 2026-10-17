import { TabList, TabSlot, TabTrigger, Tabs } from 'expo-router/ui';
import type { ComponentProps } from 'react';
import { StyleSheet, View } from 'react-native';
import { Screen } from 'react-native-screens';

import { useT } from '@/i18n';
import { IconBadge, IconBag, IconMe, IconPlanning, IconRing } from '@/ui/icons';
import { ProfileSwitch } from '@/ui/ProfileSwitch';
import { TabBarFrame, TabItem } from '@/ui/TabBar';
import { color } from '@/ui/theme';

type RenderTab = NonNullable<ComponentProps<typeof TabSlot>['renderFn']>;

/**
 * Le rendu d’onglet par défaut d’expo-router pose chaque écran en `flexGrow 1,
 * flexShrink 0` : sur le web, un onglet plus haut que la fenêtre pousse tout
 * vers le bas et son ScrollView n’a plus rien à faire défiler. On pose chaque
 * écran en plein cadre, comme les onglets de React Navigation.
 */
const renderTab: RenderTab = (descriptor, { isFocused, loaded, detachInactiveScreens }) => {
  const { lazy = true, unmountOnBlur } = descriptor.options;
  if (unmountOnBlur && !isFocused) return null;
  if (lazy && !loaded && !isFocused) return null;
  return (
    <Screen key={descriptor.route.key} enabled={detachInactiveScreens} activityState={isFocused ? 2 : 0} freezeOnBlur={false} style={[StyleSheet.absoluteFill, isFocused ? styles.focused : styles.unfocused]}>
      {descriptor.render()}
    </Screen>
  );
};

export default function TabsLayout() {
  const t = useT();
  return (
    <View style={styles.root}>
      <Tabs>
        <TabSlot renderFn={renderTab} />
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
  focused: { zIndex: 1, display: 'flex' },
  unfocused: { zIndex: 0, display: 'none' },
});
