import { type Me } from '@bc/contract';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState, type ComponentRef, type Ref } from 'react';
import { TextInput, View, type KeyboardTypeOptions, type ReturnKeyTypeOptions, type StyleProp, type TextInputProps, type ViewStyle } from 'react-native';

import { track } from '@/features/analytics';
import { ApiError, cleErreurApi, lancerLien, lireMe } from '@/lib/api';
import { dateVersIso, formaterDate, formaterTelephone, normaliserTelephone } from '@/lib/identite';
import { supabase } from '@/lib/supabase';
import { useT, type MessageKey } from '@/i18n';
import { useSession } from '@/state/session';
import { Ceremonie } from '@/screens/compte/Ceremonie';
import { CodeSaisie } from '@/screens/compte/CodeSaisie';
import { Button, Segmented } from '@/ui/kit';
import { Page, Reveal } from '@/ui/Page';
import { Tap } from '@/ui/Tap';
import { Body } from '@/ui/Text';
import { fontFamily, fontSize, makeStyles, radius, space, useTheme } from '@/ui/theme';

type Mode = 'creation' | 'connexion';
type Profil = 'abonne' | 'decouverte';
type Etape = 'formulaire' | 'code' | 'oubli' | 'nouveau' | 'verification' | 'resultat';
type CodePour = 'signup' | 'recovery';

type AuthEchec = { message?: string; code?: string; name?: string };

const ATTENTE_MS = 3 * 60 * 1000;
const SONDE_MS = 5_000;

function cleAuth(error: AuthEchec): MessageKey {
  const code = error.code ?? '';
  const msg = (error.message ?? '').toLowerCase();
  if (code === 'email_not_confirmed' || msg.includes('not confirmed')) return 'auth.emailUnverified';
  if (code === 'user_already_exists' || code === 'email_exists' || msg.includes('already registered') || msg.includes('already been registered')) return 'auth.emailUsed';
  if (code === 'weak_password' || msg.includes('at least') || msg.includes('too short') || msg.includes('weak')) return 'auth.passwordShort';
  if (code === 'invalid_credentials' || msg.includes('invalid login')) return 'auth.invalid';
  if (code === 'over_request_rate_limit' || msg.includes('rate limit')) return 'auth.tooMany';
  if (code === 'over_email_send_rate_limit') return 'auth.tooMany';
  if (msg.includes('network') || msg.includes('fetch') || error.name === 'AuthRetryableFetchError') return 'auth.offline';
  return 'auth.generic';
}

/**
 * Creation, connexion et mot de passe oublie. Apres la session, la fiche
 * est lue puis rapprochee de Deciplus si elle est encore en attente.
 * « As-tu deja un abonnement ? » oriente le parcours et les textes ; seul
 * le rapprochement ouvre l'espace adherent (CDC §2).
 */
export default function ConnexionScreen() {
  const T = useT();
  const s = useStyles();
  const params = useLocalSearchParams<{ mode?: string; profil?: string }>();
  const applyMe = useSession((st) => st.applyMe);
  const connecte = useSession((st) => st.auth === 'connecte');
  const setAbonnementDeclare = useSession((st) => st.setAbonnementDeclare);
  const [mode, setMode] = useState<Mode>(params.mode === 'connexion' ? 'connexion' : 'creation');
  const [profil, setProfil] = useState<Profil>(params.profil === 'decouverte' ? 'decouverte' : 'abonne');
  const [etape, setEtape] = useState<Etape>('formulaire');
  const [codePour, setCodePour] = useState<CodePour>('signup');
  const [prenom, setPrenom] = useState('');
  const [nom, setNom] = useState('');
  const [email, setEmail] = useState('');
  const [telephone, setTelephone] = useState('');
  const [naissance, setNaissance] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [nouveau, setNouveau] = useState('');
  const [code, setCode] = useState('');
  const [erreur, setErreur] = useState<MessageKey | null>(null);
  const [info, setInfo] = useState<MessageKey | null>(null);
  const [busy, setBusy] = useState(false);
  const [fiche, setFiche] = useState<Me | null>(null);
  const [retour, setRetour] = useState(false);
  const nomRef = useRef<ComponentRef<typeof TextInput>>(null);
  const emailRef = useRef<ComponentRef<typeof TextInput>>(null);
  const telephoneRef = useRef<ComponentRef<typeof TextInput>>(null);
  const naissanceRef = useRef<ComponentRef<typeof TextInput>>(null);
  const motDePasseRef = useRef<ComponentRef<typeof TextInput>>(null);

  const tel = normaliserTelephone(telephone);
  const dateIso = dateVersIso(naissance);
  const creationOk = prenom.trim().length >= 2 && nom.trim().length >= 2 && email.includes('@') && !!tel && !!dateIso && motDePasse.length >= 8;
  const connexionOk = email.includes('@') && motDePasse.length >= 8;
  const decouverte = mode === 'creation' && profil === 'decouverte';
  const declareAbonne = mode === 'creation' && profil === 'abonne';

  const poserFiche = (me: Me) => {
    applyMe(me);
    setFiche(me);
  };

  const entrerDansLapp = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  // Un retour : on entre tout de suite, mais seulement une fois les gardes du routeur à jour.
  // Dans le même instant que la session, l'entrée n'existe déjà plus et l'app pas encore.
  useEffect(() => {
    if (retour && connecte) router.replace('/');
  }, [retour, connecte]);

  const apresSession = async () => {
    setBusy(true);
    setErreur(null);
    try {
      const me = await lireMe();
      poserFiche(me);
      if (me.consentementParentalRequis) {
        setEtape('resultat');
        return;
      }
      if (me.link.status !== 'en_attente') {
        // Le coup de tampon est pour la première arrivée.
        if (mode === 'connexion') setRetour(true);
        else setEtape('resultat');
        return;
      }
      if (decouverte) {
        // Sans abonnement declare, on cherche quand meme une ancienne fiche (CDC §2), sans le faire attendre.
        void lancerLien().catch(() => undefined);
        setEtape('resultat');
        return;
      }
      try {
        await lancerLien();
      } catch (e) {
        if (e instanceof ApiError && e.code !== 'trop_de_demandes') {
          setErreur(cleErreurApi(e.code));
          setEtape('resultat');
          return;
        }
      }
      setEtape('verification');
    } catch (e) {
      setErreur(e instanceof ApiError ? cleErreurApi(e.code) : 'auth.generic');
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (etape !== 'verification') return undefined;
    let vivant = true;
    const debut = Date.now();
    const finir = (me: Me | null) => {
      if (!vivant) return;
      if (me) {
        applyMe(me);
        setFiche(me);
      }
      setEtape('resultat');
    };
    const sonder = async () => {
      try {
        const me = await lireMe();
        if (!vivant) return;
        applyMe(me);
        setFiche(me);
        if (me.link.status !== 'en_attente' || Date.now() - debut >= ATTENTE_MS) finir(me);
      } catch (e) {
        if (!vivant) return;
        if (e instanceof ApiError) setErreur(cleErreurApi(e.code));
        if (Date.now() - debut >= ATTENTE_MS) finir(null);
      }
    };
    void sonder();
    const intervalle = setInterval(() => void sonder(), SONDE_MS);
    const stop = setTimeout(() => finir(null), ATTENTE_MS);
    return () => {
      vivant = false;
      clearInterval(intervalle);
      clearTimeout(stop);
    };
  }, [etape, applyMe]);

  const creer = async () => {
    if (!supabase || !tel || !dateIso) return;
    track('cta_create_account', { from: 'compte' });
    setBusy(true);
    setErreur(null);
    setInfo(null);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password: motDePasse,
        options: {
          data: {
            prenom: prenom.trim(),
            nom: nom.trim(),
            telephone: tel,
            date_naissance: dateIso,
            abonnement_declare: profil === 'abonne',
          },
        },
      });
      if (error) {
        setErreur(cleAuth(error));
        return;
      }
      if (data.user && data.user.identities && data.user.identities.length === 0) {
        setErreur('auth.emailUsed');
        return;
      }
      setAbonnementDeclare(profil === 'abonne');
      if (data.session) {
        await apresSession();
        return;
      }
      setCodePour('signup');
      setCode('');
      setEtape('code');
    } catch {
      setErreur('auth.offline');
    } finally {
      setBusy(false);
    }
  };

  const entrer = async () => {
    if (!supabase) return;
    setBusy(true);
    setErreur(null);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: motDePasse });
      if (error) {
        if (cleAuth(error) === 'auth.emailUnverified') {
          await supabase.auth.resend({ type: 'signup', email: email.trim() });
          setCodePour('signup');
          setCode('');
          setInfo('auth.emailUnverified');
          setEtape('code');
          return;
        }
        setErreur(cleAuth(error));
        return;
      }
      if (data.session) await apresSession();
    } catch {
      setErreur('auth.offline');
    } finally {
      setBusy(false);
    }
  };

  const verifierCode = async (saisi: string = code) => {
    if (!supabase || busy || saisi.length !== 6) return;
    setBusy(true);
    setErreur(null);
    try {
      const { error } = await supabase.auth.verifyOtp({ email: email.trim(), token: saisi, type: codePour });
      if (error) {
        setErreur(cleAuth(error));
        return;
      }
      if (codePour === 'recovery') setEtape('nouveau');
      else await apresSession();
    } catch {
      setErreur('auth.offline');
    } finally {
      setBusy(false);
    }
  };

  const renvoyer = async () => {
    if (!supabase) return;
    setBusy(true);
    setErreur(null);
    try {
      if (codePour === 'recovery') {
        const reset = await supabase.auth.resetPasswordForEmail(email.trim());
        if (reset.error) {
          setErreur(cleAuth(reset.error));
          return;
        }
      } else {
        const { error } = await supabase.auth.resend({ type: 'signup', email: email.trim() });
        if (error) {
          setErreur(cleAuth(error));
          return;
        }
      }
      setInfo('auth.resent');
    } catch {
      setErreur('auth.offline');
    } finally {
      setBusy(false);
    }
  };

  const envoyerOubli = async () => {
    if (!supabase || !email.includes('@')) return;
    setBusy(true);
    setErreur(null);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
      if (error) {
        setErreur(cleAuth(error));
        return;
      }
      setCodePour('recovery');
      setCode('');
      setEtape('code');
    } catch {
      setErreur('auth.offline');
    } finally {
      setBusy(false);
    }
  };

  const changerMotDePasse = async () => {
    if (!supabase || nouveau.length < 8) return;
    setBusy(true);
    setErreur(null);
    try {
      const { error } = await supabase.auth.updateUser({ password: nouveau });
      if (error) {
        setErreur(cleAuth(error));
        return;
      }
      await apresSession();
    } catch {
      setErreur('auth.offline');
    } finally {
      setBusy(false);
    }
  };

  const valider = () => {
    if (busy) return;
    if (mode === 'creation' && creationOk) void creer();
    if (mode === 'connexion' && connexionOk) void entrer();
  };

  if (etape === 'verification' || etape === 'resultat') {
    return <Ceremonie phase={etape === 'verification' ? 'recherche' : 'resultat'} fiche={fiche} erreur={erreur} decouverte={decouverte} declareAbonne={declareAbonne} onEnter={entrerDansLapp} onRetry={() => void apresSession()} busy={busy} />;
  }

  const titre =
    etape === 'code' ? T('auth.codeTitle') : etape === 'oubli' ? T('auth.forgotTitle') : etape === 'nouveau' ? T('auth.newPasswordTitle') : mode === 'creation' ? T('auth.createTitle') : T('auth.signInTitle');
  const sousTitre =
    etape === 'code' ? T('auth.codeSub') : etape === 'oubli' ? T('auth.forgotSub') : etape === 'nouveau' ? T('auth.newPasswordSub') : mode === 'creation' ? (profil === 'decouverte' ? T('auth.createSubDiscover') : T('auth.createSub')) : T('auth.signInSub');

  return (
    <Page title={titre} subtitle={sousTitre} leading="close" tabBar={false}>
      <Reveal style={s.form}>
        {etape === 'formulaire' ? (
          <>
            <Segmented<Mode>
              full
              value={mode}
              onChange={(v) => {
                setMode(v);
                setErreur(null);
              }}
              options={[
                { value: 'creation', label: T('auth.create') },
                { value: 'connexion', label: T('auth.signIn') },
              ]}
            />
            {mode === 'creation' ? (
              <View style={s.field}>
                <Body size="caption" weight="bold" tone="muted">
                  {T('auth.subscriptionQuestion')}
                </Body>
                <Segmented<Profil>
                  full
                  value={profil}
                  onChange={setProfil}
                  options={[
                    { value: 'abonne', label: T('auth.subscriptionYes') },
                    { value: 'decouverte', label: T('auth.subscriptionNo') },
                  ]}
                />
              </View>
            ) : null}
            {mode === 'creation' ? (
              <View style={s.row}>
                <Field label={T('auth.firstName')} value={prenom} onChange={setPrenom} placeholder={T('auth.firstNamePh')} style={{ flex: 1 }} autoComplete="given-name" onNext={() => nomRef.current?.focus()} />
                <Field inputRef={nomRef} label={T('auth.lastName')} value={nom} onChange={setNom} placeholder={T('auth.lastNamePh')} style={{ flex: 1 }} autoComplete="family-name" onNext={() => emailRef.current?.focus()} />
              </View>
            ) : null}
            <Field inputRef={emailRef} label={T('auth.email')} value={email} onChange={setEmail} placeholder={T('auth.emailPh')} keyboard="email-address" autoComplete="email" onNext={() => (mode === 'creation' ? telephoneRef : motDePasseRef).current?.focus()} />
            {mode === 'creation' ? (
              <>
                <Field inputRef={telephoneRef} label={T('auth.phone')} value={telephone} onChange={(v) => setTelephone(formaterTelephone(v))} placeholder="06 12 34 56 78" keyboard="phone-pad" maxLength={18} autoComplete="tel" onNext={() => naissanceRef.current?.focus()} />
                {telephone.length > 0 && !tel ? <Body size="caption" tone="negative">{T('auth.phoneInvalid')}</Body> : null}
                <Field inputRef={naissanceRef} label={T('auth.birth')} value={naissance} onChange={(v) => setNaissance(formaterDate(v))} placeholder={T('auth.birthPh')} keyboard="number-pad" maxLength={10} autoComplete="birthdate-full" onNext={() => motDePasseRef.current?.focus()} />
                {naissance.length >= 8 && !dateIso ? <Body size="caption" tone="negative">{T('auth.birthInvalid')}</Body> : null}
              </>
            ) : null}
            <Field inputRef={motDePasseRef} label={T('auth.password')} value={motDePasse} onChange={setMotDePasse} placeholder={T('auth.passwordPh')} secure autoComplete={mode === 'creation' ? 'new-password' : 'current-password'} returnKey="go" onNext={valider} />
            {mode === 'creation' ? (
              <Body size="caption" tone="muted">
                {profil === 'decouverte' ? T('auth.createNoteDiscover') : T('auth.createNote')}
              </Body>
            ) : (
              <Tap onPress={() => { setErreur(null); setEtape('oubli'); }} accessibilityRole="button" accessibilityLabel={T('auth.forgot')} style={s.lien}>
                <Body size="caption" weight="bold" tone="muted">
                  {T('auth.forgot')}
                </Body>
              </Tap>
            )}
            <Button label={mode === 'creation' ? T('auth.createCta') : T('auth.signInCta')} disabled={busy || (mode === 'creation' ? !creationOk : !connexionOk)} onPress={() => void (mode === 'creation' ? creer() : entrer())} style={s.cta} />
          </>
        ) : null}

        {etape === 'code' ? (
          <>
            <CodeSaisie label={T('auth.codeLabel')} email={email.trim()} value={code} onChange={setCode} onComplete={(v) => void verifierCode(v)} />
            <Button label={T('auth.verify')} disabled={busy || code.length !== 6} onPress={() => void verifierCode()} />
            <Button label={T('auth.resend')} variant="secondary" disabled={busy} onPress={() => void renvoyer()} />
          </>
        ) : null}

        {etape === 'oubli' ? (
          <>
            <Field label={T('auth.email')} value={email} onChange={setEmail} placeholder={T('auth.emailPh')} keyboard="email-address" />
            <Button label={T('auth.forgotCta')} disabled={busy || !email.includes('@')} onPress={() => void envoyerOubli()} />
          </>
        ) : null}

        {etape === 'nouveau' ? (
          <>
            <Field label={T('auth.newPassword')} value={nouveau} onChange={setNouveau} placeholder={T('auth.passwordPh')} secure />
            {nouveau.length > 0 && nouveau.length < 8 ? <Body size="caption" tone="negative">{T('auth.passwordShort')}</Body> : null}
            <Button label={T('auth.newPasswordCta')} disabled={busy || nouveau.length < 8} onPress={() => void changerMotDePasse()} />
          </>
        ) : null}

        {erreur ? (
          <Body tone="negative">{T(erreur)}</Body>
        ) : null}
        {info ? <Body tone="muted">{T(info)}</Body> : null}
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
  style?: StyleProp<ViewStyle>;
  inputRef?: Ref<ComponentRef<typeof TextInput>>;
  autoComplete?: TextInputProps['autoComplete'];
  maxLength?: number;
  returnKey?: ReturnKeyTypeOptions;
  /** La touche du clavier passe au champ suivant, ou valide sur le dernier. */
  onNext?: () => void;
};

function Field({ label, value, onChange, placeholder, keyboard, secure, style, inputRef, autoComplete, maxLength, returnKey = 'next', onNext }: FieldProps) {
  const s = useStyles();
  const t = useTheme();
  const [focus, setFocus] = useState(false);
  return (
    <View style={[s.field, style]}>
      <Body size="caption" weight="bold" tone="muted">
        {label}
      </Body>
      <TextInput
        ref={inputRef}
        returnKeyType={returnKey}
        submitBehavior={returnKey === 'next' ? 'submit' : 'blurAndSubmit'}
        onSubmitEditing={onNext}
        autoComplete={autoComplete}
        maxLength={maxLength}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={t.textDim}
        keyboardType={keyboard}
        secureTextEntry={secure}
        autoCapitalize={keyboard || secure ? 'none' : 'words'}
        autoCorrect={false}
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
  lien: { minHeight: 44, justifyContent: 'center' },
}));
