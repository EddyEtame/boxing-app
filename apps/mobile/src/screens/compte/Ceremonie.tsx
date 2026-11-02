import type { Me } from '@bc/contract';
import * as Haptics from 'expo-haptics';
import { useState, type ComponentType } from 'react';
import { Platform, StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { Easing, FadeInDown, useAnimatedStyle, useReducedMotion, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';

import { clubById } from '@/data/clubs';
import { ouvrirOffres } from '@/features/offres';
import { useT, type MessageKey } from '@/i18n';
import { Anneau, Braises } from '@/ui/Etincelles';
import { IconBadge, IconCard, IconChart, IconChat, IconCheck, IconDisciplines, IconDocument, IconLock, IconPin, IconPlanning, type IconProps } from '@/ui/icons';
import { Button, Card, IconTile } from '@/ui/kit';
import { Page } from '@/ui/Page';
import { Photo } from '@/ui/Photo';
import { Body, Display, Mono, OnPhotoContext } from '@/ui/Text';
import { easing, GUTTER, makeStyles, radius, space, stagger, useTheme } from '@/ui/theme';

import { Ticket } from './Ticket';

const ARRIVE = Easing.bezier(easing.arrive[0], easing.arrive[1], easing.arrive[2], easing.arrive[3]);

/** La salle vide, éteinte : ce qu'on voit avant le coup de tampon. */
const SALLE = require('@/assets/photos/portet-ring-neuf.jpg');
/** L'entrée sous les feux froids (BC-015, la photo la plus forte de la banque) : on entre dans la salle. */
const FEUX = require('@/assets/photos/portet-entree-feux.jpg');
/** Le bras levé par l'arbitre : l'abonnement retrouvé. */
const VICTOIRE = require('@/assets/photos/gala-victoire.jpg');
/**
 * Le sujet à droite, le titre à gauche. Les feux sont agrandis et remontés : la tête
 * et le gant levé de la boxeuse passent au-dessus du titre, au lieu d'être dessous.
 */
const CADRAGE_FEUX = { left: '44%', top: '0%' } as const;
const AGRANDI_FEUX = 1.4;
const CADRAGE_VICTOIRE = { left: '62%', top: '0%' } as const;

type Casier = { icon: ComponentType<IconProps>; label: MessageKey };

const CLUBS: Casier = { icon: IconPin, label: 'auth.scene.tileClubs' };
const PLANNING: Casier = { icon: IconPlanning, label: 'auth.scene.tilePlanning' };
const DISCIPLINES: Casier = { icon: IconDisciplines, label: 'auth.scene.tileDisciplines' };
const BADGE: Casier = { icon: IconBadge, label: 'auth.scene.tileBadge' };
const MESSAGES: Casier = { icon: IconChat, label: 'auth.scene.tileMessages' };
const STATS: Casier = { icon: IconChart, label: 'auth.scene.tileStats' };
const FACTURES: Casier = { icon: IconCard, label: 'auth.scene.tileInvoices' };
const DOCUMENTS: Casier = { icon: IconDocument, label: 'auth.scene.tileDocuments' };

const DECOUVERTE_OUVERT = [CLUBS, PLANNING, DISCIPLINES];
const DECOUVERTE_FERME = [BADGE, MESSAGES, STATS];

type Scene = {
  fete: boolean;
  photo: number;
  cadrage?: typeof CADRAGE_FEUX | typeof CADRAGE_VICTOIRE;
  /** La photo dépasse le haut du cadre de ce facteur (ancrée en bas). */
  agrandi?: number;
  titre: string;
  texte: string;
  libelle: MessageKey;
  meta: string;
  talon: string;
  tampon: string | null;
  ouvert: Casier[];
  ferme: Casier[];
  offres: 'non' | 'premier' | 'second';
  renouveler: boolean;
};

export type Props = {
  phase: 'recherche' | 'resultat';
  fiche: Me | null;
  erreur: MessageKey | null;
  /** La personne a répondu « pas encore » à la création du compte. */
  decouverte: boolean;
  /** La personne a répondu « oui, j'en ai un » : ne rien trouver est alors un problème à expliquer. */
  declareAbonne: boolean;
  onEnter: () => void;
  onRetry: () => void;
  busy: boolean;
};

const ERREURS: MessageKey[] = ['auth.robot', 'auth.offline', 'auth.profileIncomplete', 'auth.emailUnverified', 'auth.tooMany'];

/**
 * L'arrivée dans l'app (Eddy, 30/10/2026 : « too empty… animations of success… baffled
 * bar »). La salle est éteinte, le billet monte ; dès que le compte est prêt, le tampon
 * tombe et la salle s'allume derrière lui. La vérification et le résultat sont le même
 * écran : le billet ne bouge pas quand la réponse du club arrive.
 */
export function Ceremonie({ phase, fiche, erreur, decouverte, declareAbonne, onEnter, onRetry, busy }: Props) {
  const T = useT();
  const s = useStyles();
  const reduit = useReducedMotion();
  const { height } = useWindowDimensions();
  // Assez haute pour que le titre ne touche jamais le bouton de fermeture, même sur un petit téléphone.
  const hauteurPhoto = Math.round(Math.max(280, Math.min(height * 0.42, 400)));
  const recherche = phase === 'recherche';
  const scene = composer({ T, phase, fiche, erreur, decouverte, declareAbonne });
  const [pose, setPose] = useState(false);

  const allume = useSharedValue(0);
  const eclair = useSharedValue(0);
  const zoom = useSharedValue(1.12);
  const fete = scene.fete;

  const onImpact = () => {
    setPose(true);
    if (Platform.OS !== 'web') {
      void Haptics.notificationAsync(fete ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Warning);
    }
    if (!fete) return;
    if (reduit) {
      allume.set(1);
      zoom.set(1);
      return;
    }
    allume.set(withTiming(1, { duration: 360 }));
    eclair.set(withSequence(withTiming(0.6, { duration: 60 }), withTiming(0, { duration: 460, easing: ARRIVE })));
    zoom.set(withTiming(1, { duration: 7000, easing: Easing.out(Easing.cubic) }));
  };

  const styleAllume = useAnimatedStyle(() => ({ opacity: allume.value, transform: [{ scale: zoom.value }] }));
  const styleEclair = useAnimatedStyle(() => ({ opacity: eclair.value }));

  const offres = () => ouvrirOffres(fiche?.clubPrincipal ?? fiche?.snapshot?.club, 'compte');
  const prenomNom = fiche ? `${fiche.prenom} ${fiche.nom}` : '';
  const retardActions = reduit ? 0 : 40;

  return (
    <Page padded={false} bleedTop tabBar={false} leading="close" onLeading={onEnter}>
      <View style={[s.photo, { height: hauteurPhoto }]}>
        <Photo source={SALLE} style={StyleSheet.absoluteFill} darken={0.62} scrim={0.7} scrimTop={0.4} />
        {fete ? (
          <Animated.View style={[StyleSheet.absoluteFill, styleAllume]}>
            <Photo source={scene.photo} style={[s.photoAllumee, { height: hauteurPhoto * (scene.agrandi ?? 1) }]} darken={0.06} scrim={0.5} contentPosition={scene.cadrage} priority="high" />
          </Animated.View>
        ) : null}
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, s.eclair, styleEclair]} />
        <Braises actives={fete && pose} hauteur={hauteurPhoto} />
        <OnPhotoContext.Provider value>
          <View style={s.photoBas}>
            <Animated.View key={scene.titre} entering={reduit ? undefined : FadeInDown.delay(recherche ? 120 : 200).duration(420).easing(ARRIVE)}>
              <Display size="display2" tight>
                {scene.titre}
              </Display>
            </Animated.View>
          </View>
        </OnPhotoContext.Provider>
      </View>

      <View style={s.corps}>
        <Ticket nom={prenomNom} libelle={T(scene.libelle)} meta={scene.meta} talon={scene.talon} tampon={scene.tampon} fete={fete} onImpact={onImpact} />

        <Animated.View key={scene.texte} entering={reduit ? undefined : FadeInDown.delay(recherche ? 280 : 320).duration(420).easing(ARRIVE)} accessibilityLiveRegion="polite">
          <Body weight="medium" tone="muted">
            {scene.texte}
          </Body>
        </Animated.View>

        {recherche ? <Etapes /> : null}

        {pose ? (
          <View style={s.suite}>
            <Animated.View entering={reduit ? undefined : FadeInDown.delay(retardActions).duration(420).easing(ARRIVE)} style={s.actions}>
              {scene.offres === 'premier' ? <Button label={T('auth.offers')} onPress={offres} /> : null}
              {scene.renouveler ? <Button label={T('messages.renew')} onPress={offres} /> : null}
              {erreur === 'auth.robot' || erreur === 'auth.offline' ? <Button label={T('net.retry')} variant="secondary" disabled={busy} onPress={onRetry} /> : null}
              <Button label={T('auth.enter')} variant={scene.offres === 'premier' || scene.renouveler ? 'secondary' : 'primary'} onPress={onEnter} />
              {scene.offres === 'second' ? <Button label={T('auth.offers')} variant="secondary" onPress={offres} /> : null}
            </Animated.View>
            <Rangee titre={T('auth.scene.openNow')} casiers={scene.ouvert} ouvert debut={retardActions + 160} />
            {scene.ferme.length ? <Rangee titre={T('auth.scene.withSub')} casiers={scene.ferme} ouvert={false} debut={retardActions + 400} /> : null}
          </View>
        ) : null}

        {recherche ? <Button label={T('auth.skipWait')} variant="secondary" onPress={onEnter} /> : null}
      </View>
    </Page>
  );
}

/** Ce que dit le billet selon ce que le club a répondu. */
function composer({ T, phase, fiche, erreur, decouverte, declareAbonne }: Pick<Props, 'phase' | 'fiche' | 'erreur' | 'decouverte' | 'declareAbonne'> & { T: ReturnType<typeof useT> }): Scene {
  const lien = fiche?.link.status;
  const prenom = fiche?.prenom ?? '';
  const clubId = fiche?.clubPrincipal ?? fiche?.snapshot?.club ?? null;
  const club = clubId ? clubById(clubId).court : null;
  const base = {
    fete: false,
    photo: SALLE as number,
    libelle: 'auth.scene.labelPending' as MessageKey,
    meta: T('auth.scene.metaDiscover'),
    talon: club ?? T('auth.scene.stubClubs'),
    ouvert: DECOUVERTE_OUVERT,
    ferme: [] as Casier[],
    offres: 'non' as const,
    renouveler: false,
  };

  if (phase === 'recherche') {
    return { ...base, titre: T('auth.scene.searching'), texte: T('auth.verifyingBody'), tampon: null, meta: T('auth.scene.metaChecking') };
  }
  if (erreur && ERREURS.includes(erreur)) {
    return { ...base, titre: T('auth.scene.created'), texte: T(erreur), tampon: T('auth.scene.stampPending') };
  }
  if (fiche?.consentementParentalRequis) {
    return { ...base, titre: T('auth.scene.parent'), texte: T('auth.parental'), tampon: T('auth.scene.stampParent') };
  }
  if (lien === 'lie' && fiche?.statut === 'actif') {
    const badge = fiche.snapshot?.badgeEnregistre === true;
    return {
      ...base,
      fete: true,
      photo: VICTOIRE,
      cadrage: CADRAGE_VICTOIRE,
      titre: T('auth.scene.welcome', { prenom }),
      texte: T('auth.scene.activeLead'),
      libelle: 'auth.scene.labelMember',
      meta: fiche.snapshot?.contrats[0] ?? T('auth.scene.metaMember'),
      tampon: T('auth.scene.stampActive'),
      ouvert: [badge ? BADGE : PLANNING, FACTURES, DOCUMENTS],
    };
  }
  if (lien === 'lie') {
    return {
      ...base,
      titre: T('auth.scene.back', { prenom }),
      texte: T('guest.renewBody'),
      libelle: 'auth.scene.labelMember',
      meta: T('auth.scene.metaMember'),
      tampon: T('auth.scene.stampRenew'),
      ouvert: [FACTURES, DOCUMENTS, PLANNING],
      renouveler: true,
    };
  }
  if (lien === 'a_revoir') {
    return { ...base, titre: T('auth.scene.review'), texte: T('auth.resultReview'), tampon: T('auth.scene.stampReview'), meta: T('auth.scene.metaChecking') };
  }
  if (decouverte) {
    return {
      ...base,
      fete: true,
      photo: FEUX,
      cadrage: CADRAGE_FEUX,
      agrandi: AGRANDI_FEUX,
      titre: T('auth.scene.welcome', { prenom }),
      texte: T('auth.resultDiscover'),
      libelle: 'auth.scene.labelDiscover',
      tampon: T('auth.scene.stampDiscover'),
      ferme: DECOUVERTE_FERME,
      offres: 'premier',
    };
  }
  if (lien === 'prospect') {
    if (declareAbonne) {
      return { ...base, titre: T('auth.scene.created'), texte: T('auth.resultNotFound'), libelle: 'auth.scene.labelDiscover', tampon: T('auth.scene.stampCheck'), ferme: DECOUVERTE_FERME, offres: 'second' };
    }
    return { ...base, titre: T('auth.scene.back', { prenom }), texte: T('auth.resultProspect'), libelle: 'auth.scene.labelDiscover', tampon: T('auth.scene.stampDiscover'), ferme: DECOUVERTE_FERME, offres: 'second' };
  }
  return { ...base, titre: T('auth.scene.still'), texte: T('auth.resultPending'), tampon: T('auth.scene.stampPending'), meta: T('auth.scene.metaChecking') };
}

/** Les trois étapes de la vérification : on voit où l'on en est, on ne regarde pas un écran vide. */
function Etapes() {
  const T = useT();
  const s = useStyles();
  const t = useTheme();
  const reduit = useReducedMotion();
  return (
    <Animated.View entering={reduit ? undefined : FadeInDown.delay(520).duration(420).easing(ARRIVE)}>
      <Card padded={false} style={s.etapes}>
        <View style={s.etape}>
          <View style={[s.pastille, { backgroundColor: t.positiveSoft }]}>
            <IconCheck size={16} color={t.positive} />
          </View>
          <Body weight="medium" tone="muted" style={s.etapeTexte}>
            {T('auth.scene.stepAccount')}
          </Body>
        </View>
        <View style={[s.etape, s.etapeFilet, { borderTopColor: t.line }]}>
          <View style={s.pastille}>
            <Anneau couleur={t.accent} fond={t.line} />
          </View>
          <Body weight="semi" style={s.etapeTexte}>
            {T('auth.scene.stepSearch')}
          </Body>
        </View>
        <View style={[s.etape, s.etapeFilet, { borderTopColor: t.line }]}>
          <View style={[s.pastille, { backgroundColor: t.tint }]}>
            <Body size="caption" weight="bold" tone="muted">
              3
            </Body>
          </View>
          <Body weight="medium" tone="dim" style={s.etapeTexte}>
            {T('auth.scene.stepSub')}
          </Body>
        </View>
      </Card>
    </Animated.View>
  );
}

/** Une rangée de ce que le compte ouvre ou ouvrira : trois casiers, l'un après l'autre. */
function Rangee({ titre, casiers, ouvert, debut }: { titre: string; casiers: Casier[]; ouvert: boolean; debut: number }) {
  const T = useT();
  const s = useStyles();
  const t = useTheme();
  const reduit = useReducedMotion();
  return (
    <View style={s.rangee}>
      <Mono size="micro" tone="muted">
        {titre}
      </Mono>
      <View style={s.casiers}>
        {casiers.map((c, i) => (
          <Animated.View key={c.label} entering={reduit ? undefined : FadeInDown.delay(debut + i * (stagger.step / 2)).duration(360).easing(ARRIVE)} style={s.casier}>
            <View>
              <IconTile icon={c.icon} size={44} />
              <View style={[s.etat, { backgroundColor: t.card, borderColor: t.line }]}>
                {ouvert ? <IconCheck size={11} color={t.positive} strokeWidth={2.6} /> : <IconLock size={11} color={t.textMuted} strokeWidth={2.2} />}
              </View>
            </View>
            <Body size="caption" weight="bold" tone={ouvert ? 'text' : 'muted'} numberOfLines={1}>
              {T(c.label)}
            </Body>
          </Animated.View>
        ))}
      </View>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  photo: { overflow: 'hidden', borderBottomLeftRadius: radius.card + 6, borderBottomRightRadius: radius.card + 6, justifyContent: 'flex-end', backgroundColor: '#080808' },
  photoAllumee: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  eclair: { backgroundColor: '#FFFFFF' },
  photoBas: { paddingHorizontal: GUTTER, paddingBottom: 66 },
  corps: { marginTop: -46, paddingHorizontal: GUTTER, gap: space[4] },
  suite: { gap: space[5] },
  rangee: { gap: space[3] },
  casiers: { flexDirection: 'row', gap: space[3] },
  casier: {
    flex: 1,
    alignItems: 'center',
    gap: space[2],
    paddingVertical: space[4],
    borderRadius: radius.card - 4,
    backgroundColor: t.card,
    ...(t.scheme === 'light' ? { boxShadow: t.shadowCard } : { borderWidth: 1, borderColor: t.line }),
  },
  etat: { position: 'absolute', top: -4, right: -6, width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  actions: { gap: space[3] },
  etapes: { paddingHorizontal: space[4], ...(t.scheme === 'dark' ? { borderWidth: 1, borderColor: t.line } : null) },
  etape: { flexDirection: 'row', alignItems: 'center', gap: space[3], minHeight: 58, paddingVertical: space[2] },
  etapeFilet: { borderTopWidth: 1 },
  etapeTexte: { flex: 1 },
  pastille: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
}));
