import * as WebBrowser from 'expo-web-browser';
import { Linking, View } from 'react-native';
import { useCallback, useEffect, useState } from 'react';

import { clubById } from '@/data/clubs';
import { BOUTIQUE_ROOT, urlBoutique } from '@/features/sections';
import { clock, longDate } from '@/features/time';
import { useLocale, useT } from '@/i18n';
import { ApiError, lireDocuments, lireFactures } from '@/lib/api';
import { useAppRealtime } from '@/lib/app-realtime';
import { DEFAULT_OFFER_SLUG, ouvrirCheckoutBoutique } from '@/lib/checkout-flow';
import { configReady } from '@/lib/config';
import { selectAcces, useSession } from '@/state/session';
import type { ClubId } from '@/ui/theme';
import { IconBadge, IconCard, IconDocument } from '@/ui/icons';
import { Button, Card, Row, Section } from '@/ui/kit';
import { HorsLigne } from '@/ui/Offline';
import { Page, Reveal } from '@/ui/Page';
import { Photo } from '@/ui/Photo';
import { Body, Display, Heading } from '@/ui/Text';
import { makeStyles, radius, space, stroke, useTheme } from '@/ui/theme';

import { MembersOnly } from './common/MembersOnly';

import { ageAt, type InvoiceRef, type SignedDocumentKind, type SignedDocumentRef } from '@bc/contract';

const RING = require('@/assets/photos/portet-ring-neuf.jpg');

/**
 * Abonnement : fiche Deciplus, etat commerce (Realtime), factures bridge et
 * documents signes a la souscription.
 */
export function Screen() {
  const T = useT();
  const auth = useSession((s) => s.auth);
  const me = useSession((s) => s.me);
  if (auth !== 'connecte') {
    return (
      <Page title={T('sub.title')}>
        <MembersOnly title={T('sub.lockedTitle')} body={T('sub.lockedBody')} photo={RING} atouts={[{ icon: IconDocument, title: T('sub.perkDocs'), sub: T('sub.perkDocsSub') }, { icon: IconCard, title: T('sub.perkInvoices'), sub: T('sub.perkInvoicesSub') }, { icon: IconBadge, title: T('sub.perkBadge'), sub: T('sub.perkBadgeSub') }]} />
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
  const acces = useSession(selectAcces);
  const { checkoutStatus, subscriptionStatus } = useAppRealtime(me?.id);
  const [factures, setFactures] = useState<InvoiceRef[]>([]);
  const [documents, setDocuments] = useState<SignedDocumentRef[]>([]);
  const [checkoutBusy, setCheckoutBusy] = useState(false);

  const chargerFactures = useCallback(() => {
    if (!configReady) return Promise.resolve();
    return lireFactures().then(
      (res) => setFactures(res.items),
      () => {
        /* hors ligne ou serveur : on garde la liste actuelle */
      },
    );
  }, []);

  useEffect(() => {
    void chargerFactures();
  }, [chargerFactures]);

  // Relus quand un achat aboutit : le contrat signe arrive avec l'abonnement.
  const achatAbouti = checkoutStatus === 'completed' || subscriptionStatus === 'active';
  useEffect(() => {
    if (!configReady) return undefined;
    let vivant = true;
    lireDocuments()
      .then((res) => {
        if (vivant) setDocuments(res.items);
      })
      .catch(() => {
        /* route pas encore branchee, ou hors ligne : on garde la liste attendue */
      });
    return () => {
      vivant = false;
    };
  }, [achatAbouti]);

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

  // Sans abonnement : on invite a en prendre un, plutot qu'une fiche vide (Eddy, 30/10/2026 ; CDC §3A).
  if (acces === 'decouverte' && !actif && !attente) {
    return (
      <Page title={T('sub.title')}>
        <MembersOnly title={T('sub.noneTitle')} body={T('sub.noneBody')} photo={RING} atouts={[{ icon: IconDocument, title: T('sub.perkDocs'), sub: T('sub.perkDocsSub') }, { icon: IconCard, title: T('sub.perkInvoices'), sub: T('sub.perkInvoicesSub') }, { icon: IconBadge, title: T('sub.perkBadge'), sub: T('sub.perkBadgeSub') }]} />
      </Page>
    );
  }

  const enVerification = acces === 'verification' && !actif;
  const clubCheckout: ClubId = (me.clubPrincipal || me.snapshot?.club || clubActif) as ClubId;

  const payerDansApp = async () => {
    if (!configReady || checkoutBusy) return;
    setCheckoutBusy(true);
    try {
      await ouvrirCheckoutBoutique(DEFAULT_OFFER_SLUG, clubCheckout);
      await chargerFactures();
      await recharger();
    } catch (err) {
      // Le tunnel relié au compte ne s'ouvre pas : la boutique reste accessible, sauf sans réseau.
      if (!(err instanceof ApiError && err.code === 'hors_ligne')) {
        await Linking.openURL(urlBoutique({ club: clubCheckout, offer: DEFAULT_OFFER_SLUG }));
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
    <Button label={actif ? T('sub.change') : T('messages.renew')} variant="secondary" icon={IconCard} onPress={() => void Linking.openURL(urlBoutique({ club: clubCheckout, offer: DEFAULT_OFFER_SLUG }))} />
  );

  return (
    <Page title={T('sub.title')}>
      <Reveal>
        <Card padded={false}>
          <Photo source={club.photo} style={s.heroPhoto} darken={0.36} scrim={0.8}>
            <View style={s.heroBas}>
              <View style={s.heroEtat}>
                <View style={[s.heroPoint, { backgroundColor: actif ? '#3DDC84' : 'rgba(245,245,245,0.55)' }]} />
                <Body size="caption" weight="bold">
                  {statut}
                </Body>
              </View>
              <Display size="display3" tight>
                {club.court}
              </Display>
            </View>
          </Photo>
          <View style={s.hero}>
          {checkoutStatus === 'failed' || checkoutStatus === 'expired' ? (
            <Body size="bodySmall" weight="semi" tone="negative">
              {T('sub.checkoutFailed')}
            </Body>
          ) : checkoutStatus === 'manual_review' ? (
            <Body size="bodySmall" tone="muted">
              {T('sub.checkoutReview')}
            </Body>
          ) : checkoutStatus && checkoutStatus !== 'completed' && checkoutStatus !== 'opened' ? (
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
          <Body size="bodySmall" tone="muted">
            {T('sub.amountsSoon')}
          </Body>
          </View>
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

      <Reveal>
        <DocumentsSignes documents={documents} enVerification={enVerification} mineur={ageAt(me.dateNaissance) < 18} />
      </Reveal>

      {enVerification ? null : (
        <Reveal style={s.block}>
          {ctaCheckout}
          {actif ? <Button label={T('sub.manage')} variant="ghost" onPress={() => void Linking.openURL(`${BOUTIQUE_ROOT}gerer-abonnement`)} style={s.gerer} /> : null}
        </Reveal>
      )}
    </Page>
  );
}

/** Ce que l'adherent signe a la souscription (signature de la boutique, mandat SEPA dans Deciplus). */
const DOCUMENTS_ATTENDUS: SignedDocumentKind[] = ['dossier', 'cgv', 'reglement', 'sante', 'mandat_sepa'];

/**
 * Les documents signes (Eddy, 30/10/2026). Tant que le pont ne les sert pas, on montre
 * ce qui a ete signe sans inventer de date : la liste reelle remplacera ces lignes
 * des que la route repondra, sans nouvelle version de l'app.
 */
function DocumentsSignes({ documents, enVerification, mineur }: { documents: SignedDocumentRef[]; enVerification: boolean; mineur: boolean }) {
  const T = useT();
  const s = useStyles();
  const lang = useLocale();
  const attendus: SignedDocumentKind[] = mineur ? [...DOCUMENTS_ATTENDUS, 'autorisation_parentale'] : DOCUMENTS_ATTENDUS;
  if (enVerification) {
    return (
      <Section title={T('sub.documents')}>
        <Card>
          <Body tone="muted">{T('sub.documentsAfterCheck')}</Body>
        </Card>
      </Section>
    );
  }
  return (
    <Section title={T('sub.documents')} note={T('sub.documentsNote')}>
      <Card padded={false} style={s.list}>
        {documents.length
          ? documents.map((doc, index) => (
              <Row
                key={doc.id}
                icon={IconDocument}
                title={T(`sub.documentKinds.${doc.kind}`)}
                subtitle={T('sub.documentSigned', { d: longDate(doc.signedAt.slice(0, 10), lang) })}
                right={<Pastille label={T('sub.documentPdf')} />}
                chevron={false}
                last={index === documents.length - 1}
                onPress={() => void WebBrowser.openBrowserAsync(doc.url)}
              />
            ))
          : attendus.map((kind, index) => (
              <Row
                key={kind}
                icon={IconDocument}
                title={T(`sub.documentKinds.${kind}`)}
                subtitle={kind === 'autorisation_parentale' ? T('sub.documentAskClub') : kind === 'mandat_sepa' ? T('sub.documentIfDebit') : T('sub.documentAtSignup')}
                last={index === attendus.length - 1}
              />
            ))}
      </Card>
      {documents.length ? null : (
        <Body size="caption" tone="muted" style={s.note}>
          {T('sub.documentsSoon')}
        </Body>
      )}
    </Section>
  );
}

function Pastille({ label }: { label: string }) {
  const s = useStyles();
  return (
    <View style={s.pastille}>
      <Body size="caption" weight="bold" tone="muted">
        {label}
      </Body>
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
  hero: { gap: space[3], padding: space[5] },
  heroPhoto: { height: 190, justifyContent: 'flex-end', borderTopLeftRadius: radius.card, borderTopRightRadius: radius.card },
  heroBas: { padding: space[5], gap: space[2], alignItems: 'flex-start' },
  heroEtat: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.pill, backgroundColor: 'rgba(8,8,8,0.45)' },
  heroPoint: { width: 7, height: 7, borderRadius: 4 },
  pill: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill },
  contrats: { gap: space[2] },
  note: { marginTop: space[2] },
  block: { marginTop: space[5] },
  gerer: { marginTop: space[2] },
  list: { paddingHorizontal: space[5], borderWidth: t.scheme === 'dark' ? stroke.hair : 0 },
  detail: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: space[3], minHeight: 56, paddingVertical: space[3] },
  detailValue: { flexShrink: 1, textAlign: 'right' },
  invoiceCol: { flex: 1, gap: space[1] },
  pastille: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill, backgroundColor: t.tint },
}));
