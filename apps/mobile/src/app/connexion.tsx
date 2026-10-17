import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { useSession } from '@/state/session';
import { IconClose } from '@/ui/icons';
import { Page } from '@/ui/Page';
import { Tap } from '@/ui/Tap';
import { Body, Display, Mono } from '@/ui/Text';
import { color, fontFamily, fontSize, ink, radius, space, stroke, whiteAlpha } from '@/ui/theme';

/**
 * Création de compte et connexion (CDC §2) : nom, prénom, e-mail, téléphone,
 * date de naissance, mot de passe. Puis le rapprochement avec la base Deciplus
 * (deux concordances au moins sur e-mail, téléphone, date de naissance).
 * Démonstration : la vraie version crée la session signée (.research/08-SECURITE.md).
 */
export default function ConnexionScreen() {
  const setStatut = useSession((s) => s.setStatut);
  const [mode, setMode] = useState<'connexion' | 'creation'>('creation');
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
    <Page contentStyle={styles.content}>
      <View style={styles.head}>
        <View style={{ flex: 1, gap: 2 }}>
          <Body size="caption" eyebrow tone="muted">
            {mode === 'creation' ? 'Créer mon compte' : 'Se connecter'}
          </Body>
          <Display size="display3" tight>
            {mode === 'creation' ? 'Ton club te reconnaît' : 'Content de te revoir'}
          </Display>
        </View>
        <Pressable onPress={() => router.back()} style={styles.close} accessibilityRole="button" accessibilityLabel="Fermer">
          <IconClose size={20} color={color.text} />
        </Pressable>
      </View>

      <View style={styles.switch}>
        {(['creation', 'connexion'] as const).map((m) => (
          <Pressable key={m} onPress={() => setMode(m)} style={[styles.switchBtn, mode === m && styles.switchOn]} accessibilityRole="button" accessibilityState={{ selected: mode === m }}>
            <Body size="caption" weight="bold" tone={mode === m ? 'inverse' : 'muted'}>
              {m === 'creation' ? 'Créer' : 'Me connecter'}
            </Body>
          </Pressable>
        ))}
      </View>

      {mode === 'creation' ? (
        <View style={styles.row}>
          <Field label="PRÉNOM" value={prenom} onChange={setPrenom} placeholder="Camille" style={{ flex: 1 }} />
          <Field label="NOM" value={nom} onChange={setNom} placeholder="Durand" style={{ flex: 1 }} />
        </View>
      ) : null}
      <Field label="E-MAIL" value={email} onChange={setEmail} placeholder="prenom@exemple.fr" keyboard="email-address" />
      {mode === 'creation' ? (
        <>
          <Field label="TÉLÉPHONE" value={telephone} onChange={setTelephone} placeholder="06 12 34 56 78" keyboard="phone-pad" />
          <Field label="DATE DE NAISSANCE" value={naissance} onChange={setNaissance} placeholder="JJ/MM/AAAA" keyboard="numbers-and-punctuation" />
        </>
      ) : null}
      <Field label="MOT DE PASSE" value={motDePasse} onChange={setMotDePasse} placeholder="8 caractères au moins" secure />
      {mode === 'creation' ? (
        <Body size="caption" tone="dim">
          E-mail, téléphone et date de naissance servent à te retrouver dans le fichier des adhérents, jamais à autre chose. Moins de 15 ans : un parent crée le compte.
        </Body>
      ) : (
        <Body size="caption" tone="dim">
          Mot de passe oublié ? Un lien de connexion part sur ton e-mail.
        </Body>
      )}

      <Tap
        disabled={!ok}
        onPress={() => {
          setStatut('actif');
          router.back();
        }}
        style={[styles.send, !ok && styles.sendOff]}
        accessibilityRole="button"
        accessibilityLabel={mode === 'creation' ? 'Créer mon compte' : 'Me connecter'}>
        <Body weight="bold" tone="inverse">
          {mode === 'creation' ? 'Créer mon compte' : 'Me connecter'}
        </Body>
      </Tap>
      <Mono size="micro" tone="dim">
        DÉMO : LE RAPPROCHEMENT DECIPLUS ET LA SESSION SIGNÉE ARRIVENT AVEC LE CONNECTEUR
      </Mono>
    </Page>
  );
}

function Field({ label, value, onChange, placeholder, keyboard, secure, style }: { label: string; value: string; onChange: (v: string) => void; placeholder: string; keyboard?: 'email-address' | 'phone-pad' | 'numbers-and-punctuation'; secure?: boolean; style?: object }) {
  return (
    <View style={[styles.field, style]}>
      <Mono size="micro">{label}</Mono>
      <TextInput value={value} onChangeText={onChange} placeholder={placeholder} placeholderTextColor={color.textDim} keyboardType={keyboard} secureTextEntry={secure} autoCapitalize={keyboard || secure ? 'none' : 'words'} style={styles.input} accessibilityLabel={label} />
    </View>
  );
}

const styles = StyleSheet.create({
  content: { gap: space[3] },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: space[3], marginBottom: space[2] },
  close: { width: 40, height: 40, borderRadius: radius.pill, backgroundColor: whiteAlpha[8], alignItems: 'center', justifyContent: 'center' },
  switch: { flexDirection: 'row', alignSelf: 'flex-start', backgroundColor: ink[150], borderRadius: radius.sm, padding: 3 },
  switchBtn: { paddingHorizontal: space[4], paddingVertical: 7, borderRadius: radius.xs },
  switchOn: { backgroundColor: color.text },
  row: { flexDirection: 'row', gap: space[3] },
  field: { gap: 6 },
  input: { backgroundColor: ink[150], borderRadius: radius.sm, borderWidth: stroke.hair, borderColor: whiteAlpha[8], paddingHorizontal: space[3], paddingVertical: 12, color: color.text, fontFamily: fontFamily.textMedium, fontSize: fontSize.body },
  send: { marginTop: space[2], backgroundColor: color.text, borderRadius: radius.sm, paddingVertical: 14, alignItems: 'center' },
  sendOff: { opacity: 0.4 },
});
