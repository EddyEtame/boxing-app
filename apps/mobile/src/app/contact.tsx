import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { useSession } from '@/state/session';
import { IconClose } from '@/ui/icons';
import { Page } from '@/ui/Page';
import { Tap } from '@/ui/Tap';
import { Body, Display, Mono } from '@/ui/Text';
import { color, duration, fontFamily, fontSize, ink, radius, space, stroke, whiteAlpha } from '@/ui/theme';

/**
 * Contacter Boxing Center (CDC §10) : le seul canal libre à l’initiative d’un
 * adhérent. Le message part vers la boîte de la direction (admin), jamais vers un coach.
 */
const SUJETS = ['Question générale', "Demande d’information", "Problème d’accès", 'Mon abonnement', 'Demande administrative'] as const;

export default function ContactScreen() {
  const member = useSession((s) => s.member);
  const [sujet, setSujet] = useState<(typeof SUJETS)[number]>('Question générale');
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);
  const ok = message.trim().length >= 10;

  return (
    <Page contentStyle={styles.content}>
      <View style={styles.head}>
        <View style={{ flex: 1, gap: 2 }}>
          <Body size="caption" eyebrow tone="muted">
            Contacter Boxing Center
          </Body>
          <Display size="display3" tight>
            La direction te répond
          </Display>
        </View>
        <Pressable onPress={() => router.back()} style={styles.close} accessibilityRole="button" accessibilityLabel="Fermer">
          <IconClose size={20} color={color.text} />
        </Pressable>
      </View>

      {sent ? (
        <Animated.View entering={FadeIn.duration(duration.cross)} style={styles.done}>
          <Display size="display4" tight>
            Message envoyé
          </Display>
          <Body tone="muted">La direction l’a reçu dans sa boîte. La réponse arrivera ici, en notification, et par e-mail.</Body>
          <Mono size="micro">
            {sujet.toUpperCase()} · {member.prenom.toUpperCase()} {member.nom.toUpperCase()} · Nº {member.deciplusId}
          </Mono>
          <Tap onPress={() => router.back()} style={styles.send} accessibilityRole="button" accessibilityLabel="Retour">
            <Body weight="bold" tone="inverse">
              Retour
            </Body>
          </Tap>
        </Animated.View>
      ) : (
        <>
          <Mono size="micro">SUJET</Mono>
          <View style={styles.chips}>
            {SUJETS.map((s) => (
              <Pressable key={s} onPress={() => setSujet(s)} style={[styles.chip, s === sujet && styles.chipOn]} accessibilityRole="button" accessibilityState={{ selected: s === sujet }}>
                <Body size="caption" weight="semi" tone={s === sujet ? 'inverse' : 'text'}>
                  {s}
                </Body>
              </Pressable>
            ))}
          </View>
          <Mono size="micro" style={styles.label}>
            MESSAGE
          </Mono>
          <TextInput
            value={message}
            onChangeText={setMessage}
            multiline
            placeholder="Dis-nous ce qu’il se passe. Ton club et ton numéro d’adhérent partent avec le message."
            placeholderTextColor={color.textDim}
            style={styles.input}
            accessibilityLabel="Message"
          />
          <Body size="caption" tone="dim">
            Les coachs ne reçoivent pas ces messages ; ils peuvent t’écrire, tu réponds à la direction.
          </Body>
          <Tap disabled={!ok} onPress={() => setSent(true)} style={[styles.send, !ok && styles.sendOff]} accessibilityRole="button" accessibilityLabel="Envoyer le message">
            <Body weight="bold" tone="inverse">
              Envoyer
            </Body>
          </Tap>
        </>
      )}
    </Page>
  );
}

const styles = StyleSheet.create({
  content: { gap: space[3] },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: space[3], marginBottom: space[2] },
  close: { width: 40, height: 40, borderRadius: radius.pill, backgroundColor: whiteAlpha[8], alignItems: 'center', justifyContent: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
  chip: { paddingHorizontal: space[3], paddingVertical: 8, borderRadius: radius.sm, borderWidth: stroke.thin, borderColor: ink[300] },
  chipOn: { backgroundColor: color.text, borderColor: color.text },
  label: { marginTop: space[2] },
  input: { minHeight: 150, backgroundColor: ink[150], borderRadius: radius.sm, borderWidth: stroke.hair, borderColor: whiteAlpha[8], padding: space[3], color: color.text, fontFamily: fontFamily.textMedium, fontSize: fontSize.body, lineHeight: 24, textAlignVertical: 'top' },
  send: { marginTop: space[2], backgroundColor: color.text, borderRadius: radius.sm, paddingVertical: 14, alignItems: 'center' },
  sendOff: { opacity: 0.4 },
  done: { gap: space[3], paddingTop: space[6] },
});
