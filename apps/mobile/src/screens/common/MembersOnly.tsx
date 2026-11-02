import { useEffect, useState, type ComponentType } from 'react';
import { Linking, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

import { urlBoutique } from '@/features/sections';
import { useT } from '@/i18n';
import { useSession } from '@/state/session';
import { IconLock, type IconProps } from '@/ui/icons';
import { Button, Card, IconTile } from '@/ui/kit';
import { Reveal } from '@/ui/Page';
import { Photo, type PhotoSource } from '@/ui/Photo';
import { Body, Display, type DisplayProps } from '@/ui/Text';
import { makeStyles, radius, space } from '@/ui/theme';

import { ActionsDecouverte } from './ActionsDecouverte';

export type Atout = { icon: ComponentType<IconProps>; title: string; sub: string };

/**
 * Une rubrique réservée (CDC §3B, §16) : une vraie photo, ce qu'elle contient et
 * comment l'ouvrir, jamais un écran vide.
 */
export function MembersOnly({ title, body, restricted, photo, atouts }: { title: string; body: string; restricted?: boolean; photo: PhotoSource; atouts: Atout[] }) {
  const T = useT();
  const s = useStyles();
  const clubActif = useSession((st) => st.clubActif);
  const shop = urlBoutique({ club: clubActif });
  return (
    <Reveal>
      <Card padded={false}>
        <Photo source={photo} style={s.photo} darken={0.32} scrim={0.82}>
          <View style={s.photoBas}>
            <View style={s.icon}>
              <IconLock size={20} color="#F5F5F5" />
            </View>
            <Display size="display3" tight>
              {title}
            </Display>
          </View>
        </Photo>
        <View style={s.card}>
        <Body tone="muted">{body}</Body>
        <View style={s.atouts}>
          {atouts.map((a) => (
            <View key={a.title} style={s.atout}>
              <IconTile icon={a.icon} size={40} />
              <View style={s.atoutTexte}>
                <Body weight="bold">{a.title}</Body>
                <Body size="caption" tone="muted">
                  {a.sub}
                </Body>
              </View>
            </View>
          ))}
        </View>
        {restricted ? (
          <Button label={T('messages.renew')} onPress={() => void Linking.openURL(shop)} style={s.cta} />
        ) : (
          <View style={s.cta}>
            <ActionsDecouverte from="locked" />
          </View>
        )}
        </View>
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

const useStyles = makeStyles(() => ({
  photo: { height: 210, justifyContent: 'flex-end', borderTopLeftRadius: radius.card, borderTopRightRadius: radius.card },
  photoBas: { padding: space[5], gap: space[3] },
  icon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(245,245,245,0.18)' },
  card: { gap: space[4], padding: space[5] },
  atouts: { gap: space[3] },
  atout: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
  atoutTexte: { flex: 1, gap: 2 },
  cta: { marginTop: space[1] },
}));
