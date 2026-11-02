import { useRef, useState, type ComponentRef } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { useT } from '@/i18n';
import { IconMail } from '@/ui/icons';
import { IconTile } from '@/ui/kit';
import { Body, Display } from '@/ui/Text';
import { makeStyles, radius, space, useTheme } from '@/ui/theme';

const CASES = [0, 1, 2, 3, 4, 5];

type Props = {
  label: string;
  email: string;
  value: string;
  onChange: (value: string) => void;
  /** Appelé au sixième chiffre : pas de bouton à chercher, le code part tout seul. */
  onComplete: (value: string) => void;
};

/** Le code reçu par e-mail : six cases, le clavier chiffré et le remplissage automatique du téléphone. */
export function CodeSaisie({ label, email, value, onChange, onComplete }: Props) {
  const T = useT();
  const s = useStyles();
  const t = useTheme();
  const ref = useRef<ComponentRef<typeof TextInput>>(null);
  const [focus, setFocus] = useState(true);

  const saisir = (brut: string) => {
    const propre = brut.replace(/\D/g, '').slice(0, 6);
    onChange(propre);
    if (propre.length === 6 && propre !== value) onComplete(propre);
  };

  return (
    <View style={s.racine}>
      <View style={s.envoi}>
        <IconTile icon={IconMail} size={44} />
        <Body tone="muted" style={s.envoiTexte}>
          {T('auth.codeSent', { email })}
        </Body>
      </View>
      <Pressable onPress={() => ref.current?.focus()} style={s.cases} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        {CASES.map((i) => {
          const courante = focus && (i === value.length || (i === 5 && value.length === 6));
          return (
            <View key={i} style={[s.case, { borderColor: courante ? t.accent : value[i] ? t.text : t.line }]}>
              <Display size="display3" tabular>
                {value[i] ?? ''}
              </Display>
            </View>
          );
        })}
        <TextInput
          ref={ref}
          value={value}
          onChangeText={saisir}
          keyboardType="number-pad"
          textContentType="oneTimeCode"
          autoComplete="one-time-code"
          autoFocus
          caretHidden
          maxLength={6}
          onFocus={() => setFocus(true)}
          onBlur={() => setFocus(false)}
          style={[StyleSheet.absoluteFill, s.saisie]}
          accessibilityLabel={label}
        />
      </Pressable>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  racine: { gap: space[5] },
  envoi: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
  envoiTexte: { flex: 1 },
  cases: { flexDirection: 'row', gap: space[2] },
  case: { flex: 1, height: 64, borderRadius: radius.control + 2, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', backgroundColor: t.card, ...(t.scheme === 'light' ? { boxShadow: t.shadowCard } : null) },
  saisie: { opacity: 0, color: 'transparent' },
}));
