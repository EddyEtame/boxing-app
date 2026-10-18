import { router } from 'expo-router';
import { useState } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { CLUBS, clubById } from '@/data/clubs';
import { INVOICES, type MemberStatus } from '@/data/member';
import { auClub } from '@/features/planning/model';
import { computeStats } from '@/features/stats/model';
import { dateLineFromIso, dateLong, daysUntil, euros } from '@/features/time';
import { useI18nStore, type Locale } from '@/i18n';
import { useSession } from '@/state/session';
import { IconArrow, IconChevron } from '@/ui/icons';
import { LowerThird } from '@/ui/LowerThird';
import { Page } from '@/ui/Page';
import { Tap } from '@/ui/Tap';
import { Body, Display, Mono } from '@/ui/Text';
import { color, duration, ink, radius, space, stroke, whiteAlpha } from '@/ui/theme';

const BOUTIQUE = 'https://boutique.boxingcenter.fr/';
const LU_A = '06:12';

export function Screen() {
  const member = useSession((s) => s.member);
  const setStatut = useSession((s) => s.setStatut);
  const clubsChoisis = useSession((s) => s.clubsChoisis);
  const setClubs = useSession((s) => s.setClubs);
  const locale = useI18nStore((s) => s.locale);
  const setLocale = useI18nStore((s) => s.setLocale);
  const now = new Date();
  const stats = computeStats(member, now);
  const club = clubById(member.clubPrincipal);
  const topClub = stats.parClub[0] ? clubById(stats.parClub[0].club) : club;
  const jours = member.abonnement.prochainPrelevement ? daysUntil(member.abonnement.prochainPrelevement, now) : null;
  const actif = member.statut === 'actif';
  const invite = member.statut === 'invite';
  const [pdfNote, setPdfNote] = useState<string | null>(null);

  return (
    <Page padded={false}>
      <View style={styles.head}>
        <Body size="caption" eyebrow tone="muted">
          Moi
        </Body>
        <Display size="display2" tight>
          {invite ? 'Invité' : `${member.prenom} ${member.nom}`}
        </Display>
        <Mono size="micro">
          {invite ? 'PAS ENCORE DE COMPTE · SALLES, PLANNINGS ET OFFRES SONT OUVERTS' : `Nº ${member.deciplusId} · ${club.court.toUpperCase()}`}
        </Mono>
      </View>

      {invite ? (
        <View style={styles.plate}>
          <Display size="display4" tight>
            Rejoindre Boxing Center
          </Display>
          <Body tone="muted">Un abonnement se prend en ligne, en quelques minutes. Le badge d’accès s’achète à l’accueil du club ; ton compte le retrouve ensuite ici.</Body>
          <ArrowLink label="Créer mon compte" onPress={() => router.push('/connexion')} />
          <ArrowLink label="Voir les offres" onPress={() => void Linking.openURL(BOUTIQUE)} />
        </View>
      ) : (
        <View style={styles.plate}>
          <View style={styles.plateHead}>
            <Mono size="micro">MON ABONNEMENT</Mono>
            <Mono size="micro" tone={actif ? 'positive' : 'negative'}>
              {actif ? (member.abonnement.impaye > 0 ? 'IMPAYÉ' : 'À JOUR') : 'TERMINÉ'}
            </Mono>
          </View>
          <Display size="display4" tight>
            {member.abonnement.libelle.split(' · ')[0]}
          </Display>
          <Body tone="muted">
            {member.abonnement.libelle.split(' · ')[1] ?? ''} · {euros(member.abonnement.montant)}
            <Body size="caption" tone="dim">
              ¹
            </Body>{' '}
            par prélèvement
            <Body size="caption" tone="dim">
              ²
            </Body>
          </Body>
          {actif && member.abonnement.prochainPrelevement ? (
            <View style={styles.debit}>
              <Mono size="micro">PROCHAIN PRÉLÈVEMENT</Mono>
              <Body weight="semi">
                {dateLong(member.abonnement.prochainPrelevement)}
                {jours !== null ? (
                  <Body weight="medium" tone="muted">
                    {' '}
                    · dans {jours} j
                  </Body>
                ) : null}
              </Body>
            </View>
          ) : null}
          {member.abonnement.impaye > 0 ? <LowerThird title={`Impayé : ${euros(member.abonnement.impaye)}`} meta="RÉGULARISER EN LIGNE · PAIEMENT SÉCURISÉ BOXING CENTER" style={styles.impaye} /> : null}
          <View style={styles.links}>
            <ArrowLink label={actif ? "Changer d’offre" : 'Reprendre un abonnement'} onPress={() => void Linking.openURL(BOUTIQUE)} />
          </View>
          <View style={styles.notes}>
            <Mono size="micro">¹ TTC · ² TOUTES LES 4 SEMAINES, SANS ENGAGEMENT, RÉSILIABLE À TOUT MOMENT</Mono>
          </View>
        </View>
      )}

      {!invite ? (
        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <Mono size="micro">MES FACTURES</Mono>
            <Mono size="micro">LU À {LU_A} PAR LE ROBOT</Mono>
          </View>
          {INVOICES.map((f) => (
            <Tap key={f.numero} onPress={() => setPdfNote(pdfNote === f.numero ? null : f.numero)} style={styles.invoice} accessibilityRole="button" accessibilityLabel={`Télécharger la facture ${f.numero}`}>
              <View style={styles.invoiceDate}>
                <Mono size="micro">{dateLineFromIso(f.date)}</Mono>
                <Mono size="micro" tone="dim">
                  {f.origine.toUpperCase()}
                </Mono>
              </View>
              <View style={styles.invoiceBody}>
                <Body size="bodySmall" weight="semi">
                  {f.periode}
                </Body>
                <Mono size="micro">{f.numero}</Mono>
              </View>
              <View style={styles.invoiceRight}>
                <Body weight="bold" tabular>
                  {euros(f.montant)}
                </Body>
                <Mono size="micro" tone="text">
                  {pdfNote === f.numero ? 'BIENTÔT' : 'PDF ↓'}
                </Mono>
              </View>
            </Tap>
          ))}
          {pdfNote ? (
            <Body size="caption" tone="muted" style={styles.invoiceNote}>
              Le PDF officiel sera téléchargé depuis {INVOICES.find((f) => f.numero === pdfNote)?.origine ?? 'Deciplus'} dès que le connecteur est branché. Rien n’est regénéré par l’app.
            </Body>
          ) : null}
          <Body size="caption" tone="dim" style={styles.invoiceNote}>
            Les factures viennent du système de facturation du club ; elles ne sont jamais recréées par l’app.
          </Body>
        </View>
      ) : null}

      {!invite ? (
        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <Mono size="micro">MES ENTRAÎNEMENTS</Mono>
            <Mono size="micro">{stats.total} PASSAGES</Mono>
          </View>
          <Body size="title" weight="medium" tone="muted" style={styles.phrase}>
            <Body size="title" weight="bold" tabular>
              {stats.mois}
            </Body>{' '}
            en {stats.moisLabel},{' '}
            <Body size="title" weight="bold" tabular>
              {stats.moyenneParSemaine}
            </Body>{' '}
            par semaine en moyenne, surtout{' '}
            <Body size="title" weight="bold">
              {auClub(topClub.id, topClub.court)}
            </Body>
            .
          </Body>
          <View style={styles.clubsRow}>
            {stats.parClub.map((c) => (
              <View key={c.club} style={styles.clubCell}>
                <Display size="display4" tabular tight>
                  {c.passages}
                </Display>
                <Mono size="micro">{clubById(c.club).court.toUpperCase()}</Mono>
              </View>
            ))}
          </View>
          {member.passages.slice(0, 4).map((p) => (
            <View key={p.date + p.heure} style={styles.passage}>
              <Mono size="micro" style={styles.passageDate}>
                {dateLineFromIso(p.date)}
              </Mono>
              <Body size="bodySmall" weight="semi" style={{ flex: 1 }}>
                {clubById(p.club).court}
              </Body>
              <Mono size="micro">{p.heure}</Mono>
            </View>
          ))}
        </View>
      ) : null}

      <View style={styles.section}>
        <ChevronRow label="Boutique Boxing Center" sub="Abonnements, matériel, stages, événements" onPress={() => void Linking.openURL(BOUTIQUE)} />
        <ChevronRow label="Contacter Boxing Center" sub="Question, accès, abonnement, demande administrative" onPress={() => router.push('/contact')} />
        <ChevronRow label="Notifications" sub="Direction, coachs, événements, rappels" onPress={() => router.push('/notifications')} />
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHead}>
          <Mono size="micro">RÉGLAGES</Mono>
          <Mono size="micro">v0.1</Mono>
        </View>
        <View style={styles.clubsSetting}>
          <Body weight="medium">Mes clubs</Body>
          <Body size="caption" tone="muted">
            Ceux que tu veux voir en premier : accueil, planning, propositions.
          </Body>
          <View style={styles.clubsPick}>
            {CLUBS.map((c) => {
              const on = clubsChoisis.includes(c.id);
              return (
                <Pressable
                  key={c.id}
                  onPress={() => setClubs(on ? clubsChoisis.filter((x) => x !== c.id) : [...clubsChoisis, c.id])}
                  style={[styles.clubPick, on && styles.clubPickOn]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                  accessibilityLabel={c.court}>
                  <Body size="caption" weight="bold" caps tone={on ? 'inverse' : 'muted'}>
                    {c.court}
                  </Body>
                </Pressable>
              );
            })}
          </View>
        </View>
        <SettingRow label="Langue">
          <Segment<Locale> value={locale} onChange={setLocale} options={[{ value: 'fr', label: 'FR' }, { value: 'en', label: 'EN' }]} />
        </SettingRow>
        <SettingRow label="Démo · statut">
          <Segment<MemberStatus> value={member.statut} onChange={setStatut} options={[{ value: 'actif', label: 'Actif' }, { value: 'restreint', label: 'Restreint' }, { value: 'invite', label: 'Invité' }]} />
        </SettingRow>
        <HoldToDelete />
        <Mono size="micro" tone="dim" style={styles.legal}>
          SAS BOXING CENTER · CONFIDENTIALITÉ · CONDITIONS · EXPORTER MES DONNÉES
        </Mono>
      </View>
    </Page>
  );
}

function ArrowLink({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Tap onPress={onPress} scaleTo={0.98} style={styles.arrow} accessibilityRole="button" accessibilityLabel={label}>
      <Body weight="semi">{label}</Body>
      <IconArrow size={18} color={color.text} />
    </Tap>
  );
}

function ChevronRow({ label, sub, onPress }: { label: string; sub: string; onPress: () => void }) {
  return (
    <Tap onPress={onPress} scaleTo={0.99} style={styles.chevron} accessibilityRole="button" accessibilityLabel={label}>
      <View style={{ flex: 1, gap: 2 }}>
        <Body weight="semi">{label}</Body>
        <Body size="caption" tone="muted">
          {sub}
        </Body>
      </View>
      <IconChevron size={18} color={color.textDim} />
    </Tap>
  );
}

function SettingRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.setting}>
      <Body weight="medium">{label}</Body>
      {children}
    </View>
  );
}

function Segment<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[] }) {
  return (
    <View style={styles.segment}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable key={o.value} onPress={() => onChange(o.value)} style={[styles.segmentBtn, on && styles.segmentOn]} accessibilityRole="button" accessibilityState={{ selected: on }}>
            <Body size="caption" weight="bold" tone={on ? 'inverse' : 'muted'}>
              {o.label}
            </Body>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Suppression de compte (Apple 5.1.1(v)) : maintenir 600 ms, le remplissage confirme. */
function HoldToDelete() {
  const fill = useSharedValue(0);
  const [done, setDone] = useState(false);
  const style = useAnimatedStyle(() => ({ width: `${fill.value * 100}%` }));
  return (
    <View style={styles.setting}>
      <View style={{ flex: 1, gap: 2 }}>
        <Body weight="medium">Supprimer mon compte</Body>
        <Body size="caption" tone="muted">
          {done ? 'Demande enregistrée : tes données de l’app seront effacées. Le club conserve ses obligations comptables.' : 'Maintenir 600 ms. Pas de boîte de dialogue.'}
        </Body>
      </View>
      <Pressable
        onPressIn={() => {
          fill.value = withTiming(1, { duration: 600 });
        }}
        onPressOut={() => {
          fill.value = withTiming(0, { duration: duration.jab });
        }}
        onLongPress={() => setDone(true)}
        delayLongPress={600}
        style={styles.hold}
        accessibilityRole="button"
        accessibilityLabel="Maintenir pour supprimer mon compte">
        <Animated.View style={[styles.holdFill, style]} />
        <Body size="caption" weight="bold" tone={done ? 'inverse' : 'text'} style={{ zIndex: 1 }}>
          {done ? 'Fait' : 'Maintenir'}
        </Body>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  head: { paddingHorizontal: space[4], gap: space[1], marginBottom: space[4] },
  plate: { marginHorizontal: space[4], backgroundColor: ink[150], borderRadius: radius.sm, padding: space[4], gap: space[3], borderWidth: stroke.hair, borderColor: whiteAlpha[6] },
  plateHead: { flexDirection: 'row', justifyContent: 'space-between' },
  debit: { gap: 2, paddingTop: space[3], borderTopWidth: stroke.hair, borderTopColor: whiteAlpha[8] },
  impaye: { marginTop: space[1] },
  links: { gap: space[2], paddingTop: space[2] },
  arrow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderTopWidth: stroke.hair, borderTopColor: whiteAlpha[8] },
  notes: { paddingTop: space[2] },
  section: { marginTop: space[7], paddingHorizontal: space[4] },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', paddingBottom: space[2], borderBottomWidth: stroke.hair, borderBottomColor: ink[300] },
  invoice: { flexDirection: 'row', alignItems: 'center', gap: space[3], paddingVertical: space[3], borderBottomWidth: stroke.hair, borderBottomColor: ink[200] },
  invoiceDate: { width: 78, gap: 2 },
  invoiceBody: { flex: 1, gap: 2 },
  invoiceRight: { alignItems: 'flex-end', gap: 2 },
  invoiceNote: { marginTop: space[3] },
  phrase: { marginTop: space[3] },
  clubsRow: { flexDirection: 'row', gap: space[3], marginTop: space[4], marginBottom: space[3] },
  clubCell: { flex: 1, backgroundColor: whiteAlpha[4], borderRadius: radius.xs, padding: space[3], gap: 2 },
  passage: { flexDirection: 'row', alignItems: 'center', gap: space[3], paddingVertical: 10, borderBottomWidth: stroke.hair, borderBottomColor: ink[200] },
  passageDate: { width: 78 },
  chevron: { flexDirection: 'row', alignItems: 'center', gap: space[3], paddingVertical: space[3], borderBottomWidth: stroke.hair, borderBottomColor: ink[200] },
  setting: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space[3], paddingVertical: space[3], borderBottomWidth: stroke.hair, borderBottomColor: ink[200] },
  clubsSetting: { gap: 6, paddingVertical: space[3], borderBottomWidth: stroke.hair, borderBottomColor: ink[200] },
  clubsPick: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2], marginTop: space[1] },
  clubPick: { paddingHorizontal: space[3], paddingVertical: 8, borderRadius: radius.sm, borderWidth: stroke.thin, borderColor: ink[300] },
  clubPickOn: { backgroundColor: color.text, borderColor: color.text },
  segment: { flexDirection: 'row', backgroundColor: ink[150], borderRadius: radius.sm, padding: 3 },
  segmentBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.xs },
  segmentOn: { backgroundColor: color.text },
  hold: { minWidth: 110, alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: radius.sm, borderWidth: stroke.thin, borderColor: color.negative, overflow: 'hidden' },
  holdFill: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: color.negative },
  legal: { marginTop: space[4] },
});
