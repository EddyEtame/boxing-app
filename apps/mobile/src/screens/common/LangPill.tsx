import { track } from '@/features/analytics';
import { useI18nStore, useT } from '@/i18n';
import { GlassSurface } from '@/ui/Glass';
import { IconGlobe } from '@/ui/icons';
import { Tap } from '@/ui/Tap';
import { Body } from '@/ui/Text';
import { makeStyles } from '@/ui/theme';

/** La langue, visible en haut à droite : un geste, et toute l'app change. */
export function LangPill() {
  const s = useStyles();
  const T = useT();
  const locale = useI18nStore((st) => st.locale);
  const setLocale = useI18nStore((st) => st.setLocale);
  const changer = () => {
    const suivante = locale === 'fr' ? 'en' : 'fr';
    setLocale(suivante);
    track('locale_change', { value: suivante });
  };
  return (
    <Tap onPress={changer} scaleTo={0.92} haptic="selection" accessibilityRole="button" accessibilityLabel={T('plus.language')}>
      <GlassSurface radius={22} strength="light" style={s.lang}>
        <IconGlobe size={18} />
        <Body size="bodySmall" weight="bold" tone={locale === 'fr' ? 'text' : 'dim'}>
          FR
        </Body>
        <Body size="bodySmall" weight="bold" tone="dim">
          ·
        </Body>
        <Body size="bodySmall" weight="bold" tone={locale === 'en' ? 'text' : 'dim'}>
          EN
        </Body>
      </GlassSurface>
    </Tap>
  );
}

const useStyles = makeStyles(() => ({
  lang: { height: 44, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14 },
}));
