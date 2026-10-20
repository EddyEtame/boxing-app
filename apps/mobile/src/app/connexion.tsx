import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { TextInput, View, type KeyboardTypeOptions, type StyleProp, type ViewStyle } from 'react-native';

import { useT } from '@/i18n';
import { useSession } from '@/state/session';
import { Button, Segmented } from '@/ui/kit';
import { Page, Reveal } from '@/ui/Page';
import { Body } from '@/ui/Text';
import { fontFamily, fontSize, makeStyles, radius, space, useTheme } from '@/ui/theme';

type Mode = 'creation' | 'connexion';

/**
 * Création de compte et connexion (CDC §2) : nom, prénom, e-mail, téléphone,
 * date de naissance, mot de passe. Puis le rapprochement avec la base Deciplus
 * (deux concordances au moins sur e-mail, téléphone, date de naissance).
 * Démonstration : la vraie version crée la session signée (.research/08-SECURITE.md).
 */
export default function ConnexionScreen() {
  const T = useT();
  const s = useStyles();
  const params = useLocalSearchParams<{ mode?: string }>();
  const setStatut = useSession((st) => st.setStatut);
  const [mode, setMode] = useState<Mode>(params.mode === 'connexion' ? 'connexion' : 'creation');
  const [prenom, setPrenom] = useState('');
  const [nom, setNom] = useState('');
  const [email, setEmail] = useState('');
  const [telephone, setTelephone] = useState('');
  const [naissance, setNaissance] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const creationOk = prenom.trim().length >= 2 && nom.trim().length >= 2 && email.includes('@') && telephone.replace(/\D/g, '').length >= 10 && naissance.length >= 8 && motDePasse.length >= 8;
  const connexionOk = email.includes('@') && motDePasse.length >= 8;
  const ok = mode === 'creation' ? creationOk : connexionOk;

  return (
    <Page title={mode === 'creation' ? T('auth.createTitle') : T('auth.signInTitle')} subtitle={mode === 'creation' ? T('auth.createSub') : T('auth.signInSub')} leading="close" tabBar={false}>
      <Reveal style={s.form}>
        <Segmented<Mode>
          full
          value={mode}
          onChange={setMode}
          options={[
            { value: 'creation', label: T('auth.create') },
            { value: 'connexion', label: T('auth.signIn') },
          ]}
        />
        {mode === 'creation' ? (
          <View style={s.row}>
            <Field label={T('auth.firstName')} value={prenom} onChange={setPrenom} placeholder="Camille" style={{ flex: 1 }} />
            <Field label={T('auth.lastName')} value={nom} onChange={setNom} placeholder="Durand" style={{ flex: 1 }} />
          </View>
        ) : null}
        <Field label={T('auth.email')} value={email} onChange={setEmail} placeholder={T('auth.emailPh')} keyboard="email-address" />
        {mode === 'creation' ? (
          <>
            <Field label={T('auth.phone')} value={telephone} onChange={setTelephone} placeholder="06 12 34 56 78" keyboard="phone-pad" />
            <Field label={T('auth.birth')} value={naissance} onChange={setNaissance} placeholder={T('auth.birthPh')} keyboard="numbers-and-punctuation" />
          </>
        ) : null}
        <Field label={T('auth.password')} value={motDePasse} onChange={setMotDePasse} placeholder={T('auth.passwordPh')} secure />
        <Body size="caption" tone="muted">
          {mode === 'creation' ? T('auth.createNote') : T('auth.forgot')}
        </Body>
        <Button
          label={mode === 'creation' ? T('auth.createCta') : T('auth.signInCta')}
          disabled={!ok}
          onPress={() => {
            setStatut('actif');
            if (router.canGoBack()) router.back();
            else router.replace('/');
          }}
          style={s.cta}
        />
        <Body size="caption" tone="dim" style={s.demo}>
          {T('auth.demo')}
        </Body>
      </Reveal>
    </Page>
  );
}

function Field({ label, value, onChange, placeholder, keyboard, secure, style }: { label: string; value: string; onChange: (v: string) => void; placeholder: string; keyboard?: KeyboardTypeOptions; secure?: boolean; style?: StyleProp<ViewStyle> }) {
  const s = useStyles();
  const t = useTheme();
  const [focus, setFocus] = useState(false);
  return (
    <View style={[s.field, style]}>
      <Body size="caption" weight="bold" tone="muted">
        {label}
      </Body>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={t.textDim}
        keyboardType={keyboard}
        secureTextEntry={secure}
        autoCapitalize={keyboard || secure ? 'none' : 'words'}
        onFocus={() => setFocus(true)}
        onBlur={() => setFocus(false)}
        style={[s.input, { color: t.text, borderColor: focus ? t.text : t.line }]}
        accessibilityLabel={label}
      />
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  form: { gap: space[4] },
  row: { flexDirection: 'row', gap: space[3] },
  field: { gap: 6 },
  input: { minHeight: 54, backgroundColor: t.card, borderRadius: radius.control + 2, borderWidth: 1.5, paddingHorizontal: space[4], fontFamily: fontFamily.textMedium, fontSize: fontSize.body, ...(t.scheme === 'light' ? { boxShadow: t.shadowCard } : null) },
  cta: { marginTop: space[2] },
  demo: { textAlign: 'center' },
}));
