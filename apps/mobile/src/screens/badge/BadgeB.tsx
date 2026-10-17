import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { clubById } from '@/data/clubs';
import { ageOf } from '@/data/member';
import { formatClock, useBadgeClock } from '@/features/badge/clock';
import { useBadgeProtection } from '@/features/badge/useBadgeProtection';
import { useRotatingCode } from '@/features/badge/useRotatingCode';
import { heure, nextSession } from '@/features/planning/model';
import { dateLineFromIso } from '@/features/time';
import { useSession } from '@/state/session';
import { LifeLine } from '@/ui/LifeLine';
import { Page } from '@/ui/Page';
import { QR } from '@/ui/QR';
import { Body, Display, Mono } from '@/ui/Text';
import { color, duration, ink, radius, space, stroke, whiteAlpha } from '@/ui/theme';

import { badgeLocked, BadgeLockedView } from './common';

/**
 * Direction B — le stylo du carnet. Le badge n’est pas un écran de plus : c’est
 * ce qui écrit le tampon du jour. L’écran montre le dernier tampon, et où le
 * prochain s’écrira.
 */
export function BadgeB() {
  const member = useSession((s) => s.member);
  const secret = useSession((s) => s.deviceSecret);
  const locked = badgeLocked(member);
  const windowSeconds = useBadgeClock((s) => s.windowSeconds);
  const secondsLeft = useBadgeClock((s) => s.secondsLeft);
  const { code } = useRotatingCode(member.deciplusId, secret, windowSeconds, locked === 'ok');
  const { hidden, captured } = useBadgeProtection(locked === 'ok');
  const now = new Date();
  const last = member.passages[0];
  const next = nextSession(member.clubPrincipal, now, ageOf(member, now));
  const nextClub = clubById(member.clubPrincipal);

  if (locked !== 'ok') return <BadgeLockedView reason={locked} member={member} />;

  return (
    <Page>
      <View style={styles.head}>
        <Body size="caption" eyebrow tone="muted">
          Ton badge
        </Body>
        <Body size="title" weight="semi">
          Le stylo du carnet
        </Body>
        <Body size="bodySmall" tone="muted">
          Le lecteur de la porte lit ce code et tamponne ta séance du jour.
        </Body>
      </View>

      <Animated.View entering={FadeIn.duration(duration.cross)} style={styles.plate}>
        <View style={styles.ledgerLine}>
          <Mono size="micro">Nº {member.badge.numero}</Mono>
          <Mono size="micro">
            {member.prenom.toUpperCase()} {member.nom.toUpperCase()}
          </Mono>
        </View>
        <View style={styles.qrWrap}>
          {code && !hidden ? (
            <QR value={code.payload} size={216} />
          ) : (
            <View style={styles.qrHidden}>
              <Mono size="caption">{hidden ? 'BADGE MASQUÉ' : 'CALCUL DU CODE'}</Mono>
            </View>
          )}
        </View>
        <LifeLine secondsLeft={secondsLeft} windowSeconds={windowSeconds} height={1} />
        <View style={styles.ledgerLine}>
          <Mono size="micro">JETON · {formatClock(secondsLeft)}</Mono>
          <Mono size="micro">FENÊTRE {windowSeconds} S · HORS LIGNE OK</Mono>
        </View>
        <View style={styles.ledgerLine}>
          <Mono size="micro">CODE COMPTOIR</Mono>
          <Mono size="caption" tone="text">
            {code ? `${code.digits.slice(0, 3)} ${code.digits.slice(3)}` : '--- ---'}
          </Mono>
        </View>
      </Animated.View>

      <View style={styles.section}>
        <View style={styles.sectionHead}>
          <Mono size="micro">DERNIER TAMPON</Mono>
          <Mono size="micro">Nº {String(member.passages.length).padStart(3, '0')}</Mono>
        </View>
        {last ? (
          <View style={styles.entry}>
            <View style={styles.entryText}>
              <Body weight="semi">
                {clubById(last.club).court} · {last.heure}
              </Body>
              <Mono size="micro">{dateLineFromIso(last.date)} · PASSAGE LU PAR LE LECTEUR</Mono>
            </View>
            <View style={[styles.stamp, { borderColor: color.accentOnDark }]}>
              <Display size="display5" tight style={styles.stampText}>
                Présent
              </Display>
            </View>
          </View>
        ) : null}
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHead}>
          <Mono size="micro">PROCHAIN TAMPON</Mono>
          <Mono size="micro">Nº {String(member.passages.length + 1).padStart(3, '0')}</Mono>
        </View>
        <View style={[styles.entry, styles.entryEmpty]}>
          <View style={styles.entryText}>
            <Body tone="muted">
              S’écrira ici quand le lecteur te verra
              {next ? ` · ${next.jourLabel.toLowerCase()} ${heure(next.slot.debut)}, ${next.activite.libelle.toLowerCase()} ${nextClub.id === 'minimes' || nextClub.id === 'etats-unis' ? 'aux' : 'à'} ${nextClub.court}` : ''}.
            </Body>
          </View>
          <View style={[styles.stamp, styles.stampEmpty]}>
            <Display size="display5" tight style={[styles.stampText, { color: whiteAlpha[20] }]}>
              Présent
            </Display>
          </View>
        </View>
      </View>

      {captured ? (
        <Mono size="micro" tone="accent" style={styles.capture}>
          CAPTURE DÉTECTÉE · CE CODE EXPIRE DANS {formatClock(secondsLeft)}
        </Mono>
      ) : null}
    </Page>
  );
}

const styles = StyleSheet.create({
  head: { gap: space[1], marginBottom: space[4] },
  plate: { backgroundColor: ink[150], borderRadius: radius.sm, borderWidth: stroke.hair, borderColor: whiteAlpha[8], padding: space[4], gap: space[3] },
  ledgerLine: { flexDirection: 'row', justifyContent: 'space-between' },
  qrWrap: { alignItems: 'center', paddingVertical: space[2] },
  qrHidden: { width: 216, height: 216, borderRadius: radius.sm, backgroundColor: ink[0], alignItems: 'center', justifyContent: 'center' },
  section: { marginTop: space[6] },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', paddingBottom: space[2], borderBottomWidth: stroke.hair, borderBottomColor: ink[300] },
  entry: { flexDirection: 'row', alignItems: 'center', gap: space[3], paddingVertical: space[3] },
  entryEmpty: { borderBottomWidth: stroke.hair, borderBottomColor: ink[200], borderStyle: 'dashed' },
  entryText: { flex: 1, gap: 2 },
  stamp: { borderWidth: 1.5, borderRadius: radius.xs, paddingHorizontal: 8, paddingVertical: 4, transform: [{ rotate: '-5deg' }] },
  stampEmpty: { borderColor: whiteAlpha[12], borderStyle: 'dashed' },
  stampText: { color: color.accentOnDark, fontSize: 16, lineHeight: 16 },
  capture: { marginTop: space[4] },
});
