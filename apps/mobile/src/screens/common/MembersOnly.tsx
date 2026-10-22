import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Linking, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

import { BOUTIQUE_URL } from '@/features/sections';
import { track } from '@/features/analytics';
import { useT } from '@/i18n';
import { IconLock } from '@/ui/icons';
import { Button, Card } from '@/ui/kit';
import { Reveal } from '@/ui/Page';
import { Body, Display, Heading, type DisplayProps } from '@/ui/Text';
import { makeStyles, radius, space } from '@/ui/theme';

/**
 * Une rubrique réservée (CDC §3B, §16) : on montre ce qu'elle contient et
 * comment l'ouvrir, jamais un écran vide.
 */
export function MembersOnly({ title, body, restricted }: { title: string; body: string; restricted?: boolean }) {
  const T = useT();
  const s = useStyles();
  return (
    <Reveal>
      <Card style={s.card}>
        <View style={s.icon}>
          <IconLock size={26} />
        </View>
        <Heading level="section">{title}</Heading>
        <Body tone="muted">{body}</Body>
        {restricted ? (
          <Button label={T('messages.renew')} onPress={() => void Linking.openURL(BOUTIQUE_URL)} style={s.cta} />
        ) : (
          <>
            <Button label={T('guest.create')} onPress={() => {
              track('cta_create_account', { from: 'locked' });
              router.push('/connexion');
            }} style={s.cta} />
            <Button label={T('guest.signIn')} variant="secondary" onPress={() => {
              track('cta_sign_in', { from: 'locked' });
              router.push('/connexion?mode=connexion');
            }} />
          </>
        )}
      </Card>
    </Reveal>
  );
}

/** Un nombre qui compte jusqu'à sa valeur (800 ms), une fois, à l'ouverture. */
export function CountUp({ value, duration = 800, ...rest }: { value: number; duration?: number } & Omit<DisplayProps, 'children'>) {
  const reduced = useReducedMotion();
  const [shown, setShown] = useState(reduced ? value : 0);
  useEffect(() => {
    if (reduced) return;
    let raf = 0;
    const start = Date.now();
    const tick = () => {
      const p = Math.min(1, (Date.now() - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setShown(Math.round(value * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration, reduced]);
  return (
    <Display tabular {...rest}>
      {reduced ? value : shown}
    </Display>
  );
}

const useStyles = makeStyles((t) => ({
  card: { gap: space[3] },
  icon: { width: 56, height: 56, borderRadius: radius.tile, alignItems: 'center', justifyContent: 'center', backgroundColor: t.tint },
  cta: { marginTop: space[3] },
}));
