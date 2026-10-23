import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

import { INVOICES, libelleIn } from '@/data/member';
import { BOUTIQUE_URL } from '@/features/sections';
import { daysUntil, euros, longDate, periodRange, shortDay } from '@/features/time';
import { useLocale, useT } from '@/i18n';
import { useSession } from '@/state/session';
import { IconCard } from '@/ui/icons';
import { Button, Card, Section } from '@/ui/kit';
import { LowerThird } from '@/ui/LowerThird';
import { Page, Reveal } from '@/ui/Page';
import { Tap } from '@/ui/Tap';
import { Body, Display, Mono, OnPhotoContext } from '@/ui/Text';
import { makeStyles, radius, space, stroke, useTheme } from '@/ui/theme';

import { MembersOnly } from './common/MembersOnly';

/** L'heure de la dernière lecture de la fiche par le robot Deciplus (démo). */
const LU_A = '06:12';

/**
 * Mon abonnement et mes factures (CDC §5). La carte est l'objet : navy vers la
 * nuit, un halo rouge qui respire. En dessous, les faits, avec leur source et
 * l'heure où le robot les a lus. Les factures viennent du système du club ;
 * l'app ne les recrée jamais.
 */
export function Screen() {
  const T = useT();
  const statut = useSession((s) => s.member.statut);
  if (statut === 'invite') {
    return (
      <Page title={T('sub.title')}>
        <MembersOnly title={T('sub.lockedTitle')} body={T('sub.lockedBody')} />
      </Page>
    );
  }
  return <SubscriptionBody />;
}

function SubscriptionBody() {
  const T = useT();
  const s = useStyles();
  const t = useTheme();
  const lang = useLocale();
  const member = useSession((st) => st.member);
  const [pdf, setPdf] = useState<string | null>(null);
  const actif = member.statut === 'actif';
  const ab = member.abonnement;
  const jours = ab.prochainPrelevement ? daysUntil(ab.prochainPrelevement, new Date()) : null;
  const [offre, periode] = libelleIn(ab.libelle, lang).split(' · ');

  return (
    <Page title={T('sub.title')}>
      <Reveal>
        <SubscriptionCard offre={offre} periode={periode ?? ''} montant={ab.montant} actif={actif} impaye={ab.impaye > 0} />
      </Reveal>

      {ab.impaye > 0 ? (
        <Reveal style={s.block}>
          <Card>
            <LowerThird title={T('sub.unpaid', { m: euros(ab.impaye) })} meta={T('sub.unpaidMeta')} />
            <Button label={T('sub.regularize')} variant="accent" onPress={() => void Linking.openURL(BOUTIQUE_URL)} style={s.cta} />
          </Card>
        </Reveal>
      ) : null}

      <Reveal>
        <Section title={T('sub.details')} note={T('sub.readAt', { h: LU_A })}>
          <Card padded={false} style={s.list}>
            <Detail label={T('sub.status')} value={actif ? T('sub.statusActive') : T('sub.statusEnded')} tone={actif ? 'positive' : 'negative'} />
            <Detail label={T('sub.type')} value={ab.type === 'prelevement' ? T('sub.typeDebit') : T('sub.typeCash')} />
            <Detail label={T('sub.start')} value={longDate(ab.debut, lang)} />
            {actif && ab.prochainPrelevement ? <Detail label={T('sub.nextDebit')} value={`${longDate(ab.prochainPrelevement, lang)}${jours !== null ? ` · ${T('sub.inDays', { n: jours })}` : ''}`} /> : null}
            <Detail label={T('sub.badge')} value={member.badge.enregistre ? T('sub.badgeOk', { n: member.badge.numero }) : T('sub.badgeNone')} />
            <Detail label={T('sub.managedBy')} value="Deciplus" last />
          </Card>
        </Section>
      </Reveal>

      <Reveal>
        <Section title={T('sub.invoices')} note={T('sub.invoicesNote')}>
          <Card padded={false} style={s.list}>
            {INVOICES.map((f, i) => (
              <Tap key={f.numero} onPress={() => setPdf(pdf === f.numero ? null : f.numero)} scaleTo={0.985} accessibilityRole="button" accessibilityLabel={T('sub.download', { n: f.numero })} style={[s.invoice, i < INVOICES.length - 1 && { borderBottomWidth: stroke.hair, borderBottomColor: t.line }]}>
                <View style={{ flex: 1, gap: 2 }}>
                  <Body weight="bold" numberOfLines={1}>
                    {'du' in f ? periodRange(f.du, f.au, lang) : T('sub.badgeInvoice')}
                  </Body>
                  <Body size="caption" tone="muted">
                    {shortDay(f.date, lang)} · {f.origine}
                  </Body>
                  <Mono size="caption" tone="dim">
                    {f.numero}
                  </Mono>
                </View>
                <View style={s.invoiceRight}>
                  <Body weight="black" tabular>
                    {euros(f.montant)}
                  </Body>
                  <View style={[s.pdf, { backgroundColor: t.chip }]}>
                    <Body size="caption" weight="bold">
                      {pdf === f.numero ? T('sub.soon') : 'PDF'}
                    </Body>
                  </View>
                </View>
              </Tap>
            ))}
          </Card>
          {pdf ? (
            <Body size="caption" tone="muted" style={s.note}>
              {T('sub.pdfNote', { origine: INVOICES.find((f) => f.numero === pdf)?.origine ?? 'Deciplus' })}
            </Body>
          ) : null}
        </Section>
      </Reveal>

      <Reveal style={s.block}>
        <Button label={actif ? T('sub.change') : T('messages.renew')} variant="secondary" icon={IconCard} onPress={() => void Linking.openURL(BOUTIQUE_URL)} />
        <Body size="caption" tone="dim" style={s.note}>
          {T('sub.footnote')}
        </Body>
      </Reveal>
    </Page>
  );
}

function SubscriptionCard({ offre, periode, montant, actif, impaye }: { offre: string; periode: string; montant: number; actif: boolean; impaye: boolean }) {
  const T = useT();
  const s = useStyles();
  const reduced = useReducedMotion();
  const glow = useSharedValue(0);
  useEffect(() => {
    if (reduced) return;
    glow.value = withRepeat(withTiming(1, { duration: 4200, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [glow, reduced]);
  const glowStyle = useAnimatedStyle(() => ({ opacity: 0.45 + glow.value * 0.35, transform: [{ scale: 1 + glow.value * 0.12 }] }));
  const [entier, cents] = montant.toFixed(2).split('.');
  return (
    <View style={s.subCard}>
      <LinearGradient colors={['#20254B', '#141933', '#0B0E1C']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      <Animated.View style={[s.glow, glowStyle]}>
        <LinearGradient colors={['rgba(232,0,28,0.55)', 'rgba(232,0,28,0)']} style={StyleSheet.absoluteFill} start={{ x: 0.5, y: 0.5 }} end={{ x: 1, y: 1 }} />
      </Animated.View>
      <OnPhotoContext.Provider value>
        <View style={s.subTop}>
          <View style={s.subPill}>
            <Body size="caption" weight="bold">
              {offre}
            </Body>
          </View>
          <View style={[s.subPill, { backgroundColor: actif && !impaye ? 'rgba(61,220,132,0.18)' : 'rgba(255,77,94,0.2)' }]}>
            <Body size="caption" weight="bold" style={{ color: actif && !impaye ? '#3DDC84' : '#FF4D5E' }}>
              {!actif ? T('sub.statusEnded') : impaye ? T('plus.statusUnpaid') : T('plus.statusActive')}
            </Body>
          </View>
        </View>
        <View style={s.subBottom}>
          <Body size="bodySmall" weight="semi" tone="muted">
            {periode}
          </Body>
          <View style={s.price}>
            <Display size="display1" tight tabular upper={false}>
              {entier}
            </Display>
            <Display size="display4" tight tabular upper={false} style={s.cents}>
              ,{cents} €
            </Display>
          </View>
          <Body size="caption" tone="muted">
            {T('sub.perDebit')}
          </Body>
        </View>
      </OnPhotoContext.Provider>
    </View>
  );
}

function Detail({ label, value, tone, last }: { label: string; value: string; tone?: 'positive' | 'negative'; last?: boolean }) {
  const s = useStyles();
  const t = useTheme();
  return (
    <View style={[s.detail, !last && { borderBottomWidth: stroke.hair, borderBottomColor: t.line }]}>
      <Body tone="muted">{label}</Body>
      <Body weight="bold" tone={tone ?? 'text'} style={s.detailValue}>
        {value}
      </Body>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  block: { marginTop: space[5] },
  cta: { marginTop: space[4] },
  subCard: { height: 236, borderRadius: radius.card + 4, overflow: 'hidden', justifyContent: 'space-between', boxShadow: t.shadowFloat },
  glow: { position: 'absolute', top: -60, right: -80, width: 300, height: 300, borderRadius: 150, overflow: 'hidden' },
  subTop: { flexDirection: 'row', justifyContent: 'space-between', padding: space[5] },
  subPill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.pill, backgroundColor: 'rgba(245,245,245,0.12)' },
  subBottom: { padding: space[5], gap: 2 },
  price: { flexDirection: 'row', alignItems: 'flex-end' },
  cents: { marginBottom: 8, marginLeft: 2 },
  list: { paddingHorizontal: space[5], borderWidth: t.scheme === 'dark' ? stroke.hair : 0 },
  detail: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: space[3], minHeight: 56, paddingVertical: space[3] },
  detailValue: { flexShrink: 1, textAlign: 'right' },
  invoice: { flexDirection: 'row', alignItems: 'center', gap: space[3], paddingVertical: space[4] },
  invoiceRight: { alignItems: 'flex-end', gap: 6 },
  pdf: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill },
  note: { marginTop: space[3] },
}));
