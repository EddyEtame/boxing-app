import { Linking, View } from 'react-native';

import { clubById } from '@/data/clubs';
import { BOUTIQUE_URL } from '@/features/sections';
import { clock, longDate } from '@/features/time';
import { useLocale, useT } from '@/i18n';
import { useSession } from '@/state/session';
import { IconCard } from '@/ui/icons';
import { Button, Card, Section } from '@/ui/kit';
import { HorsLigne } from '@/ui/Offline';
import { Page, Reveal } from '@/ui/Page';
import { Body, Heading } from '@/ui/Text';
import { makeStyles, radius, space, stroke, useTheme } from '@/ui/theme';

import { MembersOnly } from './common/MembersOnly';

/**
 * Ce que la fiche dit vraiment : contrats, abonnement, badge, date de lecture.
 * Les echeances et les factures ne sont pas encore livrees par le serveur.
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

function Corps() {
  const T = useT();
  const s = useStyles();
  const t = useTheme();
  const lang = useLocale();
  const me = useSession((st) => st.me);
  const clubActif = useSession((st) => st.clubActif);
  if (!me) return null;
  const snap = me.snapshot;
  const club = snap?.club ? clubById(snap.club) : me.clubPrincipal ? clubById(me.clubPrincipal) : clubById(clubActif);
  const actif = snap?.abonnementActif === true;
  const attente = snap?.abonnementEnAttente === true;
  const statut = !snap ? T('sub.noSnapshot') : actif ? T('sub.statusActive') : attente ? T('sub.pending') : T('sub.statusEnded');
  const lu = snap ? `${longDate(snap.readAt.slice(0, 10), lang)} · ${clock(snap.readAt)}` : null;

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
        <Section title={T('sub.invoices')}>
          <Card>
            <Heading level="card">{T('sub.invoicesEmpty')}</Heading>
            <Body tone="muted" style={s.note}>
              {T('sub.invoicesEmptyBody')}
            </Body>
          </Card>
        </Section>
      </Reveal>

      <Reveal style={s.block}>
        <Button label={actif ? T('sub.change') : T('messages.renew')} variant="secondary" icon={IconCard} onPress={() => void Linking.openURL(BOUTIQUE_URL)} />
      </Reveal>
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
}));
