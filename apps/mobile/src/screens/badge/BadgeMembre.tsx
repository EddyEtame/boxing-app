import { ageAt } from '@bc/contract';
import { useEffect } from 'react';
import { View } from 'react-native';

import { clubById } from '@/data/clubs';
import { track } from '@/features/analytics';
import { heure, nextSession } from '@/features/planning/model';
import { relativeDay, shortDay } from '@/features/time';
import { useLocale, useT } from '@/i18n';
import { useSession } from '@/state/session';
import { Card } from '@/ui/kit';
import { Page } from '@/ui/Page';
import { Body, Heading } from '@/ui/Text';
import { makeStyles, space, stroke, useTheme } from '@/ui/theme';

import { Stamp } from '../home/parts';

/** Le badge reel : enregistre ou non. Le QR tournant attend un secret du serveur. */
export function BadgeMembre() {
  const T = useT();
  const s = useStyles();
  const t = useTheme();
  const lang = useLocale();
  const me = useSession((st) => st.me);
  const clubActif = useSession((st) => st.clubActif);
  useEffect(() => {
    track('badge_open');
  }, []);
  if (!me) return null;
  const club = clubById(me.clubPrincipal ?? clubActif);
  const now = new Date();
  const next = nextSession(club.id, now, ageAt(me.dateNaissance, now));
  const last = me.passages[0];
  const enregistre = me.snapshot?.badgeEnregistre === true;
  const initiale = `${me.prenom[0] ?? ''}${me.nom[0] ?? ''}`;

  return (
    <Page title={T('badge.title')} subtitle={club.court}>
      <Card>
        <View style={s.who}>
          <View style={[s.initials, { backgroundColor: t.primary }]}>
            <Body weight="black" tone="onPrimary">
              {initiale}
            </Body>
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Heading level="card" numberOfLines={1}>
              {me.prenom} {me.nom}
            </Heading>
            <Body size="bodySmall" tone={enregistre ? 'positive' : 'muted'}>
              {enregistre ? T('badge.recorded') : T('badge.notRecorded')}
            </Body>
          </View>
        </View>
        <Body tone="muted" style={s.note}>
          {T('badge.qrSoon')}
        </Body>
        {me.consentementParentalRequis ? (
          <Body size="bodySmall" tone="muted" style={s.note}>
            {T('plus.parental')}
          </Body>
        ) : null}
      </Card>

      <Card style={s.block}>
        <Body size="caption" weight="bold" eyebrow tone="muted">
          {T('badge.lastStamp')}
        </Body>
        {last ? (
          <View style={s.entry}>
            <View style={{ flex: 1, gap: 2 }}>
              <Heading level="card">
                {clubById(last.club).court} · {last.heure}
              </Heading>
              <Body size="caption" tone="muted">
                {shortDay(last.date, lang)} · {T('badge.readByReader')}
              </Body>
            </View>
            <Stamp label={T('stats.present')} ink />
          </View>
        ) : (
          <Body tone="muted" style={s.note}>
            {T('stats.empty')}
          </Body>
        )}
        <View style={[s.sep, { backgroundColor: t.line }]} />
        <Body size="caption" weight="bold" eyebrow tone="muted">
          {T('badge.nextStamp')}
        </Body>
        <Body tone="muted" style={s.note}>
          {next ? T('badge.nextStampText', { day: relativeDay(next.offset, next.jour, lang, true), h: heure(next.slot.debut), cours: lang === 'fr' ? next.activite.libelle.toLowerCase() : next.activite.libelle }) : T('badge.nextStampNone')}
        </Body>
      </Card>
    </Page>
  );
}

const useStyles = makeStyles((t) => ({
  who: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
  initials: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  note: { marginTop: space[3] },
  block: { marginTop: space[4] },
  entry: { flexDirection: 'row', alignItems: 'center', gap: space[3], paddingVertical: space[3] },
  sep: { height: stroke.hair, marginVertical: space[3] },
}));
