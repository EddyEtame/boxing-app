import { Linking, View } from 'react-native';
import { useCallback, useEffect, useState } from 'react';

import { clubById } from '@/data/clubs';
import { BOUTIQUE_URL } from '@/features/sections';
import { clock, longDate } from '@/features/time';
import { useLocale, useT } from '@/i18n';
import { ApiError, lireFactures } from '@/lib/api';
import { useAppRealtime } from '@/lib/app-realtime';
import { DEFAULT_OFFER_SLUG, ouvrirCheckoutBoutique } from '@/lib/checkout-flow';
import { configReady } from '@/lib/config';
import { useSession } from '@/state/session';
import type { ClubId } from '@/ui/theme';
import { IconCard } from '@/ui/icons';
import { Button, Card, Section } from '@/ui/kit';
import { HorsLigne } from '@/ui/Offline';
import { Page, Reveal } from '@/ui/Page';
import { Body, Heading } from '@/ui/Text';
import { makeStyles, radius, space, stroke, useTheme } from '@/ui/theme';

import { MembersOnly } from './common/MembersOnly';

import type { InvoiceRef } from '@bc/contract';

/**
 * Abonnement : fiche Deciplus, etat commerce (Realtime) et factures bridge.
 */
export function Screen() {
  const T = useT();
  const auth = useSession((s) => s.auth);
  const me = useSession((s) => s.me);
  if (auth !== 'connecte') {
    return (
      <Page title={T('sub.title')}>
        <MembersOnly title={T('sub.lockedTitle')} body={T('sub.lockedBody')} />
      </Page>
    );
  }
  if (!me) return <HorsLigne />;
  return <Corps />;
}

function formatEuros(cents: number, lang: 'fr' | 'en'): string {
  const value = cents / 100;
  return new Intl.NumberFormat(lang === 'fr' ? 'fr-FR' : 'en-GB', { style: 'currency', currency: 'EUR' }).format(value);
}

function Corps() {
  const T = useT();
  const s = useStyles();
  const t = useTheme();
  const lang = useLocale();
  const me = useSession((st) => st.me);
  const clubActif = useSession((st) => st.clubActif);
  const recharger = useSession((st) => st.recharger);
  const { checkoutStatus, subscriptionStatus } = useAppRealtime(me?.id);
  const [factures, setFactures] = useState<InvoiceRef[]>([]);
  const [checkoutBusy, setCheckoutBusy] = useState(false);

  const chargerFactures = useCallback(async () => {
    if (!configReady) return;
    try {
      const res = await lireFactures();
      setFactures(res.items);
    } catch {
      /* hors ligne ou serveur : on garde la liste actuelle */
    }
  }, []);

  useEffect(() => {
    void chargerFactures();
  }, [chargerFactures]);

  useEffect(() => {
    if (checkoutStatus === 'completed' || subscriptionStatus === 'active') {
      void chargerFactures();
      void recharger();
    }
  }, [checkoutStatus, subscriptionStatus, chargerFactures, recharger]);

  if (!me) return null;
  const snap = me.snapshot;
  const club = snap?.club ? clubById(snap.club) : me.clubPrincipal ? clubById(me.clubPrincipal) : clubById(clubActif);
  const actifSnap = snap?.abonnementActif === true;
  const actifCommerce = subscriptionStatus === 'active';
  const actif = actifCommerce || actifSnap;
  const attente =
    snap?.abonnementEnAttente === true ||
    subscriptionStatus === 'activating' ||
    checkoutStatus === 'paid_pending_deciplus' ||
    checkoutStatus === 'payment_pending';
  const statut = !snap && !subscriptionStatus
    ? T('sub.noSnapshot')
    : actif
      ? T('sub.statusActive')
      : attente
        ? T('sub.pending')
        : T('sub.statusEnded');
  const lu = snap ? `${longDate(snap.readAt.slice(0, 10), lang)} · ${clock(snap.readAt)}` : null;

  const clubCheckout: ClubId = (me.clubPrincipal || me.snapshot?.club || clubActif) as ClubId;

  const payerDansApp = async () => {
    if (!configReady || checkoutBusy) return;
    setCheckoutBusy(true);
    try {
      await ouvrirCheckoutBoutique(DEFAULT_OFFER_SLUG, clubCheckout);
      await chargerFactures();
      await recharger();
    } catch (err) {
      if (err instanceof ApiError && err.code === 'profil_incomplet') {
        await Linking.openURL(BOUTIQUE_URL);
      }
    } finally {
      setCheckoutBusy(false);
    }
  };

  const ctaCheckout = configReady ? (
    <Button
      label={actif ? T('sub.change') : T('messages.renew')}
      variant="secondary"
      icon={IconCard}
      disabled={checkoutBusy}
      onPress={() => void payerDansApp()}
    />
  ) : (
    <Button label={actif ? T('sub.change') : T('messages.renew')} variant="secondary" icon={IconCard} onPress={() => void Linking.openURL(BOUTIQUE_URL)} />
  );

  return (
    <Page title={T('sub.title')}>
      <Reveal>
        <Card style={s.hero}>
          <Heading level="section">{club.court}</Heading>
          <View style={[s.pill, { backgroundColor: actif ? t.positiveSoft : t.negativeSoft }]}>
            <Body size="caption" weight="bold" tone={actif ? 'positive' : 'negative'}>
              {statut}
            </Body>
          </View>
          {checkoutStatus && checkoutStatus !== 'completed' && checkoutStatus !== 'opened' ? (
            <Body size="bodySmall" tone="muted">
              {T('sub.pending')}
            </Body>
          ) : null}
          {snap && snap.contrats.length ? (
            <View style={s.contrats}>
              {snap.contrats.map((c) => (
                <Body key={c} weight="semi">
                  {c}
                </Body>
              ))}
            </View>
          ) : (
            <Body tone="muted" style={s.note}>
              {T('sub.noContract')}
            </Body>
          )}
          <Body size="bodySmall" tone="muted" style={s.note}>
            {T('sub.amountsSoon')}
          </Body>
        </Card>
      </Reveal>

      <Reveal>
        <Section title={T('sub.details')} note={lu ? T('sub.readAt', { h: lu }) : undefined}>
          <Card padded={false} style={s.list}>
            <Detail label={T('sub.status')} value={actif ? T('sub.statusActive') : attente ? T('sub.pending') : T('sub.statusEnded')} tone={actif ? 'positive' : 'negative'} />
            <Detail label={T('sub.badge')} value={snap?.badgeEnregistre ? T('sub.badgeYes') : T('sub.badgeNo')} />
            <Detail label={T('sub.managedBy')} value="Deciplus" last />
          </Card>
        </Section>
      </Reveal>

      {me.consentementParentalRequis ? (
        <Reveal>
          <Card>
            <Body tone="muted">{T('auth.parental')}</Body>
          </Card>
        </Reveal>
      ) : null}

      <Reveal>
        <Section title={T('sub.invoices')} note={T('sub.invoicesNote')}>
          {factures.length ? (
            <Card padded={false} style={s.list}>
              {factures.map((row, index) => (
                <View
                  key={row.id}
                  style={[s.detail, index < factures.length - 1 && { borderBottomWidth: stroke.hair, borderBottomColor: t.line }]}
                >
                  <View style={s.invoiceCol}>
                    <Body weight="semi">{row.label}</Body>
                    <Body size="bodySmall" tone="muted">
                      {row.invoiceNumber} · {longDate(row.issuedAt.slice(0, 10), lang)}
                    </Body>
                  </View>
                  <Body weight="bold">{formatEuros(row.amountTtcCents, lang)}</Body>
                </View>
              ))}
            </Card>
          ) : (
            <Card>
              <Heading level="card">{T('sub.invoicesEmpty')}</Heading>
              <Body tone="muted" style={s.note}>
                {T('sub.invoicesEmptyBody')}
              </Body>
            </Card>
          )}
        </Section>
      </Reveal>

      <Reveal style={s.block}>{ctaCheckout}</Reveal>
    </Page>
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
  hero: { gap: space[3] },
  pill: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill },
  contrats: { gap: space[2] },
  note: { marginTop: space[2] },
  block: { marginTop: space[5] },
  list: { paddingHorizontal: space[5], borderWidth: t.scheme === 'dark' ? stroke.hair : 0 },
  detail: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: space[3], minHeight: 56, paddingVertical: space[3] },
  detailValue: { flexShrink: 1, textAlign: 'right' },
  invoiceCol: { flex: 1, gap: space[1] },
}));
