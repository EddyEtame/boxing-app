import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import Svg, { Line, Path } from 'react-native-svg';

import { Gerbe, Onde } from '@/ui/Etincelles';
import { Logo } from '@/ui/Logo';
import { LowerThird } from '@/ui/LowerThird';
import { Body, Display, Mono } from '@/ui/Text';
import { easing, fontSize, GUTTER, MAX_CONTENT_WIDTH, space } from '@/ui/theme';

const ARRIVE = Easing.bezier(easing.arrive[0], easing.arrive[1], easing.arrive[2], easing.arrive[3]);

const HAUTEUR = 182;
const TALON = 74;
const ENCOCHE = 10;
const RAYON = 18;
/** Un objet, pas un écran : le papier et l'encre du billet ne changent pas avec l'ambiance. */
const PAPIER = '#FBFAF7';
const ENCRE = '#20254B';
const ROUGE = '#E8001C';
const GRIS = '#6E7388';

/** Le billet et ses vraies encoches : il peut chevaucher la photo sans laisser voir de pastille. */
function contour(l: number, x: number): string {
  const h = HAUTEUR;
  const r = RAYON;
  const e = ENCOCHE;
  return [
    `M${r},0`,
    `H${x - e}`,
    `A${e},${e} 0 0 0 ${x + e},0`,
    `H${l - r}`,
    `A${r},${r} 0 0 1 ${l},${r}`,
    `V${h - r}`,
    `A${r},${r} 0 0 1 ${l - r},${h}`,
    `H${x + e}`,
    `A${e},${e} 0 0 0 ${x - e},${h}`,
    `H${r}`,
    `A${r},${r} 0 0 1 0,${h - r}`,
    `V${r}`,
    `A${r},${r} 0 0 1 ${r},0`,
    'Z',
  ].join(' ');
}

type Props = {
  nom: string;
  libelle: string;
  meta: string;
  talon: string;
  /** Tant qu'il est nul, le billet passe au lecteur. Dès qu'il arrive, il tombe. */
  tampon: string | null;
  /** Encre rouge, onde et gerbe : les bonnes nouvelles. Sinon, un coup de tampon sobre. */
  fete: boolean;
  onImpact: () => void;
};

/**
 * Le billet du compte (Eddy, 30/10/2026 : « animations of success »). Un billet de
 * soirée de gala monte du noir, passe au lecteur le temps de la vérification, et le
 * tampon tombe : l'impact fait reculer le billet, et l'onde et les éclats partent du
 * point d'impact. Le même objet dit tous les états, ce qui n'est pas un badge d'accès :
 * aucun QR ici, le badge physique reste obligatoire (CDC §4).
 */
export function Ticket({ nom, libelle, meta, talon, tampon, fete, onImpact }: Props) {
  const reduit = useReducedMotion();
  const { width } = useWindowDimensions();
  const l = Math.min(width, MAX_CONTENT_WIDTH) - GUTTER * 2;
  const x = l - TALON;
  // Bebas fait environ 0,38 em par caractère : le nom tient entier, jusqu'au plancher de lecture.
  const corpsNom = Math.max(18, Math.min(fontSize.display3, Math.floor((x - space[4] * 2) / (nom.length * 0.38))));
  const monte = useSharedValue(reduit ? 1 : 0);
  const encre = useSharedValue(0);
  const recul = useSharedValue(0);
  const lecteur = useSharedValue(0);
  const [impact, setImpact] = useState(false);
  // Le dernier rappel, sans relancer le coup de tampon à chaque rendu du parent.
  const rappel = useRef(onImpact);
  useEffect(() => {
    rappel.current = onImpact;
  });

  useEffect(() => {
    if (!reduit) monte.set(withDelay(120, withTiming(1, { duration: 720, easing: ARRIVE })));
  }, [reduit, monte]);

  useEffect(() => {
    if (tampon || reduit) return undefined;
    lecteur.set(withRepeat(withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.quad) }), -1, true));
    return () => lecteur.set(0);
  }, [tampon, reduit, lecteur]);

  useEffect(() => {
    if (!tampon) return undefined;
    if (reduit) {
      encre.set(1);
      const tout = setTimeout(() => rappel.current(), 0);
      return () => clearTimeout(tout);
    }
    const attente = 980;
    // Le seul rebond de l'app : l'encre (registre des décisions, 17/10/2026).
    encre.set(withDelay(attente, withSequence(withTiming(1.06, { duration: 170, easing: Easing.in(Easing.cubic) }), withTiming(1, { duration: 180 }))));
    const minuteur = setTimeout(() => {
      setImpact(true);
      recul.set(withSequence(withTiming(1, { duration: 60 }), withTiming(0, { duration: 420, easing: ARRIVE })));
      rappel.current();
    }, attente + 170);
    return () => clearTimeout(minuteur);
  }, [tampon, reduit, encre, recul]);

  const objet = useAnimatedStyle(() => ({
    opacity: monte.value,
    transform: [{ translateY: (1 - monte.value) * 54 + recul.value * 8 }, { scale: 1 - recul.value * 0.025 }],
  }));
  const trait = useAnimatedStyle(() => ({ transform: [{ translateY: 14 + lecteur.value * (HAUTEUR - 28) }] }));
  const coup = useAnimatedStyle(() => ({
    opacity: Math.min(1, encre.value * 1.4) * 0.94,
    transform: [{ rotate: '-9deg' }, { scale: encre.value === 0 ? 2.8 : 2.8 - Math.min(encre.value, 1) * 1.8 + Math.max(0, encre.value - 1) * -1.2 }],
  }));
  const teinte = fete ? ROUGE : GRIS;

  return (
    <Animated.View style={[styles.racine, { width: l }, objet]}>
      <View style={[StyleSheet.absoluteFill, styles.ombre]} />
      <Svg width={l} height={HAUTEUR} style={StyleSheet.absoluteFill}>
        <Path d={contour(l, x)} fill={PAPIER} />
        <Line x1={x} y1={ENCOCHE + 6} x2={x} y2={HAUTEUR - ENCOCHE - 6} stroke="#C9C4B8" strokeWidth={1.5} strokeDasharray="4 6" />
      </Svg>

      <View style={[styles.corps, { width: x }]}>
        <Logo width={92} variant="plain" />
        <View style={styles.titulaire}>
          <Mono size="micro" style={{ color: GRIS }}>
            {libelle}
          </Mono>
          <Display size="display3" tight numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6} style={{ color: ENCRE, fontSize: corpsNom }}>
            {nom}
          </Display>
        </View>
        <LowerThird meta={meta} compact ink={ENCRE} style={styles.meta} />
      </View>

      <View style={[styles.talon, { left: x, width: TALON }]}>
        <Display size="display5" numberOfLines={1} style={[styles.talonTexte, { color: ENCRE }]}>
          {talon}
        </Display>
      </View>

      {tampon ? null : (
        <Animated.View pointerEvents="none" style={[styles.lecteur, trait]}>
          <View style={styles.lecteurTrait} />
        </Animated.View>
      )}

      {tampon ? (
        <View pointerEvents="none" style={[styles.ancre, { left: x - ANCRE_L / 2 - 8, top: HAUTEUR - 42 - ANCRE_H / 2 }]}>
          <Animated.View style={[styles.tampon, { borderColor: teinte }, coup]}>
            <View style={[styles.tamponInterieur, { borderColor: teinte }]}>
              <Body weight="bold" numberOfLines={1} style={[styles.tamponTexte, { color: teinte }]}>
                {tampon}
              </Body>
            </View>
          </Animated.View>
          {fete ? (
            <View style={styles.pointImpact}>
              <Onde active={impact} />
              <Onde active={impact} couleur="#FFFFFF" retard={110} />
              <Gerbe active={impact} />
            </View>
          ) : null}
        </View>
      ) : null}
    </Animated.View>
  );
}

const ANCRE_L = 220;
const ANCRE_H = 120;

const styles = StyleSheet.create({
  racine: { height: HAUTEUR, alignSelf: 'center' },
  ombre: { borderRadius: RAYON, boxShadow: '0px 18px 40px rgba(8,8,8,0.32)' },
  corps: { height: HAUTEUR, paddingVertical: space[4], paddingHorizontal: space[4], justifyContent: 'space-between' },
  titulaire: { gap: 2 },
  meta: { marginRight: 96 },
  talon: { position: 'absolute', top: 0, height: HAUTEUR, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  talonTexte: { width: 150, fontSize: 20, lineHeight: 24, textAlign: 'left', transform: [{ rotate: '90deg' }] },
  lecteur: { position: 'absolute', left: 0, right: 0, top: 0, paddingHorizontal: 2 },
  lecteurTrait: { height: 2, backgroundColor: ROUGE, boxShadow: '0px 0px 12px rgba(232,0,28,0.85)' },
  ancre: { position: 'absolute', width: ANCRE_L, height: ANCRE_H, alignItems: 'center', justifyContent: 'center' },
  tampon: { borderWidth: 3, borderRadius: 10, padding: 2, backgroundColor: 'rgba(251,250,247,0.55)' },
  tamponInterieur: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 1 },
  tamponTexte: { fontFamily: 'BebasNeue_400Regular', fontSize: 27, lineHeight: 31, letterSpacing: 1, textTransform: 'uppercase' },
  pointImpact: { position: 'absolute', left: ANCRE_L / 2, top: ANCRE_H / 2, width: 0, height: 0 },
});
