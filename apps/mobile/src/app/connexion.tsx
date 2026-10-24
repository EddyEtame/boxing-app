import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState, type ComponentRef, type Ref } from 'react';
import { ScrollView, TextInput, View, type KeyboardTypeOptions, type ReturnKeyTypeOptions, type StyleProp, type ViewStyle } from 'react-native';

import { CLUBS } from '@/data/clubs';
import { track } from '@/features/analytics';
import { useT } from '@/i18n';
import { parseBirthDate, useSession } from '@/state/session';
import { Button, Chip, Segmented } from '@/ui/kit';
import { GUTTER, fontFamily, fontSize, makeStyles, radius, space, useTheme, type ClubId } from '@/ui/theme';
import { Page, Reveal } from '@/ui/Page';
import { Body } from '@/ui/Text';

type Mode = 'creation' | 'connexion';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** « 14031999 » devient « 14/03/1999 » pendant la frappe ; les barres ne se tapent pas. */
export function formatBirth(input: string): string {
  const d = input.replace(/\D/g, '').slice(0, 8);
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`;
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
}

/** « 0612345678 » devient « 06 12 34 56 78 » ; un numéro en +33 reste tel quel. */
export function formatPhone(input: string): string {
  if (input.trim().startsWith('+')) return input;
  return input.replace(/\D/g, '').slice(0, 10).replace(/(\d{2})(?=\d)/g, '$1 ');
}

/**
 * Création de compte et connexion (CDC §2) : nom, prénom, e-mail, téléphone,
 * date de naissance, mot de passe, puis le rapprochement avec la base Deciplus
 * (deux concordances au moins). Sans serveur (23/10/2026) : le compte créé reste
 * sur ce téléphone, sans le mot de passe ; la connexion ouvre le compte de
 * démonstration, et l'écran le dit.
 */
export default function ConnexionScreen() {
  const T = useT();
  const s = useStyles();
  const params = useLocalSearchParams<{ mode?: string }>();
  const createAccount = useSession((st) => st.createAccount);
  const signIn = useSession((st) => st.signIn);
  const [mode, setMode] = useState<Mode>(params.mode === 'connexion' ? 'connexion' : 'creation');
  const [prenom, setPrenom] = useState('');
  const [nom, setNom] = useState('');
  const [email, setEmail] = useState('');
  const [telephone, setTelephone] = useState('');
  const [naissance, setNaissance] = useState('');
  const [club, setClub] = useState<ClubId | null>(null);
  const [motDePasse, setMotDePasse] = useState('');
  const [tried, setTried] = useState(false);
  const nomRef = useRef<ComponentRef<typeof TextInput>>(null);
  const emailRef = useRef<ComponentRef<typeof TextInput>>(null);
  const phoneRef = useRef<ComponentRef<typeof TextInput>>(null);
  const birthRef = useRef<ComponentRef<typeof TextInput>>(null);
  const passwordRef = useRef<ComponentRef<typeof TextInput>>(null);

  const birth = parseBirthDate(naissance);
  const errors = {
    prenom: prenom.trim().length < 2,
    nom: nom.trim().length < 2,
    email: !EMAIL.test(email.trim()),
    telephone: telephone.replace(/\D/g, '').length < 10,
    naissance: !birth,
    club: !club,
    motDePasse: motDePasse.length < 8,
  };
  const creationOk = !Object.values(errors).some(Boolean);
  const connexionOk = !errors.email && !errors.motDePasse;
  const ok = mode === 'creation' ? creationOk : connexionOk;
  const show = (k: keyof typeof errors) => tried && errors[k];

  const done = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };
  const submit = () => {
    setTried(true);
    if (!ok) return;
    if (mode === 'creation' && birth && club) {
      createAccount({ prenom: prenom.trim(), nom: nom.trim(), email, dateNaissance: birth, club });
      track('cta_create_account', { from: 'form', value: true });
    } else {
      signIn(email);
      track('cta_sign_in', { from: 'form', value: true });
    }
    done();
  };

  return (
    <Page title={mode === 'creation' ? T('auth.createTitle') : T('auth.signInTitle')} subtitle={mode === 'creation' ? T('auth.createSub') : T('auth.signInSub')} leading="close" tabBar={false}>
      <Reveal style={s.form}>
        <Segmented<Mode>
          full
          value={mode}
          onChange={(m) => {
            setMode(m);
            setTried(false);
          }}
          options={[
            { value: 'creation', label: T('auth.create') },
            { value: 'connexion', label: T('auth.signIn') },
          ]}
        />
        {mode === 'creation' ? (
          <View style={s.row}>
            <Field label={T('auth.firstName')} value={prenom} onChange={setPrenom} placeholder={T('auth.firstNamePh')} error={show('prenom') ? T('auth.errName') : undefined} style={{ flex: 1 }} autoComplete="given-name" onNext={() => nomRef.current?.focus()} />
            <Field inputRef={nomRef} label={T('auth.lastName')} value={nom} onChange={setNom} placeholder={T('auth.lastNamePh')} error={show('nom') ? T('auth.errName') : undefined} style={{ flex: 1 }} autoComplete="family-name" onNext={() => emailRef.current?.focus()} />
          </View>
        ) : null}
        <Field inputRef={emailRef} label={T('auth.email')} value={email} onChange={setEmail} placeholder={T('auth.emailPh')} keyboard="email-address" error={show('email') ? T('auth.errEmail') : undefined} autoComplete="email" onNext={() => (mode === 'creation' ? phoneRef : passwordRef).current?.focus()} />
        {mode === 'creation' ? (
          <>
            <Field inputRef={phoneRef} label={T('auth.phone')} value={telephone} onChange={(v) => setTelephone(formatPhone(v))} placeholder="06 12 34 56 78" keyboard="phone-pad" maxLength={18} error={show('telephone') ? T('auth.errPhone') : undefined} autoComplete="tel" onNext={() => birthRef.current?.focus()} />
            <Field inputRef={birthRef} label={T('auth.birth')} value={naissance} onChange={(v) => setNaissance(formatBirth(v))} placeholder={T('auth.birthPh')} keyboard="number-pad" maxLength={10} error={show('naissance') ? T('auth.errBirth') : undefined} autoComplete="birthdate-full" onNext={() => passwordRef.current?.focus()} />
            <View style={s.field}>
              <Body size="caption" weight="bold" tone={show('club') ? 'negative' : 'muted'}>
                {T('auth.club')}
              </Body>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.clubsScroll} contentContainerStyle={s.clubs} keyboardShouldPersistTaps="handled">
                {CLUBS.map((c) => (
                  <Chip key={c.id} label={c.court} selected={club === c.id} onPress={() => setClub(c.id)} />
                ))}
              </ScrollView>
              {show('club') ? (
                <Body size="caption" weight="semi" tone="negative">
                  {T('auth.errClub')}
                </Body>
              ) : null}
            </View>
          </>
        ) : null}
        <Field inputRef={passwordRef} label={T('auth.password')} value={motDePasse} onChange={setMotDePasse} placeholder={T('auth.passwordPh')} secure error={show('motDePasse') ? T('auth.errPassword') : undefined} autoComplete={mode === 'creation' ? 'new-password' : 'current-password'} returnKey="go" onNext={submit} />
        <Body size="caption" tone="muted">
          {mode === 'creation' ? T('auth.createNote') : T('auth.forgot')}
        </Body>
        <Button label={mode === 'creation' ? T('auth.createCta') : T('auth.signInCta')} onPress={submit} style={s.cta} />
        <Body size="caption" tone="dim" style={s.demo}>
          {mode === 'creation' ? T('auth.demoCreate') : T('auth.demoSignIn')}
        </Body>
      </Reveal>
    </Page>
  );
}

type FieldProps = {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  keyboard?: KeyboardTypeOptions;
  secure?: boolean;
  error?: string;
  autoComplete?: 'given-name' | 'family-name' | 'email' | 'tel' | 'birthdate-full' | 'new-password' | 'current-password';
  style?: StyleProp<ViewStyle>;
  inputRef?: Ref<ComponentRef<typeof TextInput>>;
  maxLength?: number;
  /** Le bouton du clavier : « Suivant » passe au champ d'après, « OK » envoie. */
  returnKey?: ReturnKeyTypeOptions;
  onNext?: () => void;
};

function Field({ label, value, onChange, placeholder, keyboard, secure, error, autoComplete, style, inputRef, maxLength, returnKey = 'next', onNext }: FieldProps) {
  const s = useStyles();
  const t = useTheme();
  const [focus, setFocus] = useState(false);
  return (
    <View style={[s.field, style]}>
      <Body size="caption" weight="bold" tone={error ? 'negative' : 'muted'}>
        {label}
      </Body>
      <TextInput
        ref={inputRef}
        returnKeyType={returnKey}
        submitBehavior={returnKey === 'next' ? 'submit' : 'blurAndSubmit'}
        onSubmitEditing={onNext}
        maxLength={maxLength}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={t.textDim}
        keyboardType={keyboard}
        secureTextEntry={secure}
        autoCapitalize={keyboard || secure ? 'none' : 'words'}
        autoCorrect={false}
        autoComplete={autoComplete}
        onFocus={() => setFocus(true)}
        onBlur={() => setFocus(false)}
        style={[s.input, { color: t.text, borderColor: error ? t.negative : focus ? t.text : t.line }]}
        accessibilityLabel={label}
        accessibilityHint={error}
      />
      {error ? (
        <Body size="caption" weight="semi" tone="negative">
          {error}
        </Body>
      ) : null}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  form: { gap: space[4] },
  row: { flexDirection: 'row', gap: space[3] },
  field: { gap: 6 },
  clubsScroll: { flexGrow: 0, marginHorizontal: -GUTTER },
  clubs: { paddingHorizontal: GUTTER, gap: space[2] },
  input: { minHeight: 54, backgroundColor: t.card, borderRadius: radius.control + 2, borderWidth: 1.5, paddingHorizontal: space[4], fontFamily: fontFamily.textMedium, fontSize: fontSize.body, ...(t.scheme === 'light' ? { boxShadow: t.shadowCard } : null) },
  cta: { marginTop: space[2] },
  demo: { textAlign: 'center' },
}));
