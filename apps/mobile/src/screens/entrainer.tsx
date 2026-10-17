import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, LinearTransition } from 'react-native-reanimated';

import { CLUBS, clubById } from '@/data/clubs';
import { ageOf } from '@/data/member';
import { TRAINING_TYPES, TRAININGS, type Niveau, type Training, type TrainingType } from '@/data/trainings';
import { SECURITE_LABEL, VIDEOS, type Video } from '@/data/videos';
import { familleColor, heure, JOURS, JOURS_COURTS, jourFr, nextSession, plagesLibres, type Famille } from '@/features/planning/model';
import { useSession } from '@/state/session';
import { IconLock } from '@/ui/icons';
import { LowerThird } from '@/ui/LowerThird';
import { Page } from '@/ui/Page';
import { Photo } from '@/ui/Photo';
import { Tap } from '@/ui/Tap';
import { Body, Display, Mono } from '@/ui/Text';
import { color, duration, ink, radius, space, stagger, stroke, whiteAlpha, type ClubId } from '@/ui/theme';

type Filtre = 'tous' | Famille;

const FILTRES: { id: Filtre; label: string }[] = [
  { id: 'tous', label: 'Tout' },
  { id: 'anglaise', label: 'Anglaise' },
  { id: 'piedsPoings', label: 'Pieds-poings' },
  { id: 'mma', label: 'MMA' },
  { id: 'grappling', label: 'Grappling' },
  { id: 'crossTraining', label: 'Prépa' },
];

export function Screen() {
  const member = useSession((s) => s.member);
  const clubsChoisis = useSession((s) => s.clubsChoisis);
  const now = new Date();
  const age = ageOf(member, now);
  const actif = member.statut === 'actif';
  const next = nextSession(member.clubPrincipal, now, age);
  const [filtre, setFiltre] = useState<Filtre>('tous');
  const [trainings, setTrainings] = useState<Training[]>(TRAININGS);
  const [composer, setComposer] = useState(false);

  const videos = orderVideos(filtre, next?.activite.famille);

  return (
    <Page padded={false}>
      <View style={styles.head}>
        <Body size="caption" eyebrow tone="muted">
          Le coin du coach
        </Body>
        <Display size="display2">S’entraîner</Display>
      </View>

      <SectionHead left="VIDÉOS ET TUTORIELS" right={actif ? `${VIDEOS.length} VIDÉOS` : `${VIDEOS.filter((v) => v.gratuite).length} GRATUITES`} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersScroll} contentContainerStyle={styles.filters}>
        {FILTRES.map((f) => (
          <Tap key={f.id} onPress={() => setFiltre(f.id)} scaleTo={0.95} haptic="selection" style={[styles.filter, filtre === f.id && styles.filterOn]} accessibilityRole="button" accessibilityState={{ selected: filtre === f.id }}>
            <Body size="caption" weight="bold" caps tone={filtre === f.id ? 'inverse' : 'muted'}>
              {f.label}
            </Body>
          </Tap>
        ))}
      </ScrollView>
      <Animated.View layout={LinearTransition.duration(duration.cross)} style={styles.videos}>
        {videos.map((v, i) => (
          <VideoCard key={v.id} video={v} index={i} locked={!actif && !v.gratuite} first={i === 0 && !!next && v.famille === next.activite.famille} />
        ))}
      </Animated.View>

      <SectionHead left="ENTRE MEMBRES" right="ACCÈS LIBRE" style={styles.sectionGap} />
      <Body size="bodySmall" tone="muted" style={styles.intro}>
        Une proposition vit dans un créneau d’accès libre. Pas de messagerie : on s’inscrit, on se retrouve sur place.
      </Body>

      {actif ? (
        <>
          <Tap onPress={() => setComposer((c) => !c)} style={styles.propose} accessibilityRole="button" accessibilityLabel="Proposer un entraînement">
            <Body weight="bold" tone="inverse">
              {composer ? 'Fermer' : 'Proposer un entraînement'}
            </Body>
          </Tap>
          {composer ? (
            <Composer
              age={age}
              clubDefault={member.clubPrincipal}
              onPublish={(t) => {
                setTrainings((list) => [t, ...list]);
                setComposer(false);
              }}
            />
          ) : null}
        </>
      ) : (
        <View style={styles.lockedBox}>
          <IconLock size={18} color={color.textMuted} />
          <Body size="bodySmall" tone="muted" style={{ flex: 1 }}>
            Réservé aux adhérents actifs. Les créneaux d’accès libre restent visibles dans le planning.
          </Body>
        </View>
      )}

      <SlotGroups trainings={trainings} clubs={clubsChoisis} today={jourFr(now)} age={age} actif={actif} onToggle={(id) => setTrainings((list) => list.map((t) => (t.id === id ? { ...t, jeParticipe: !t.jeParticipe, participants: t.participants + (t.jeParticipe ? -1 : 1) } : t)))} />
    </Page>
  );
}

/** La première entrée est toujours le drill de ta prochaine séance. */
function orderVideos(filtre: Filtre, famille?: Famille): Video[] {
  const list = filtre === 'tous' ? VIDEOS : VIDEOS.filter((v) => v.famille === filtre);
  if (!famille) return list;
  const i = list.findIndex((v) => v.famille === famille);
  if (i <= 0) return list;
  return [list[i], ...list.slice(0, i), ...list.slice(i + 1)];
}

function SectionHead({ left, right, style }: { left: string; right: string; style?: object }) {
  return (
    <View style={[styles.sectionHead, style]}>
      <Mono size="micro">{left}</Mono>
      <Mono size="micro">{right}</Mono>
    </View>
  );
}

function VideoCard({ video, index, locked, first }: { video: Video; index: number; locked: boolean; first: boolean }) {
  const tint = familleColor(video.famille);
  return (
    <Animated.View entering={FadeIn.delay(Math.min(index, stagger.max) * stagger.step).duration(duration.cross)}>
      <Tap style={styles.video} accessibilityRole="button" accessibilityLabel={video.titre}>
        <Photo source={video.photo} style={styles.videoPhoto} darken={locked ? 0.6 : 0.3} scrim={0.5} grain={false}>
          <View style={styles.videoTop}>
            <Mono size="micro" tone="text" numberOfLines={1} style={styles.videoTopLeft}>
              Nº {String(video.numero).padStart(2, '0')} · {video.dureeMin} MIN
            </Mono>
            {first ? (
              <Mono size="micro" tone="accent" numberOfLines={1}>
                PROCHAINE SÉANCE
              </Mono>
            ) : locked ? (
              <IconLock size={16} color={color.text} />
            ) : null}
          </View>
          <View style={styles.videoBottom}>
            <Display size="display4" tight numberOfLines={2}>
              {video.titre}
            </Display>
          </View>
        </Photo>
        <View style={styles.videoMeta}>
          <LowerThird meta={`${video.disciplineLabel.toUpperCase()} · ${video.niveau.toUpperCase()} · ${video.objectif.toUpperCase()}${video.securite !== 'seul' ? ' · ' + SECURITE_LABEL[video.securite] : ''}`} bar={video.securite === 'seul' ? tint : color.accent} compact />
          {locked ? (
            <Body size="caption" tone="muted">
              Réservé aux adhérents
            </Body>
          ) : null}
        </View>
      </Tap>
    </Animated.View>
  );
}

function SlotGroups({ trainings, clubs, today, age, actif, onToggle }: { trainings: Training[]; clubs: ClubId[]; today: number; age: number; actif: boolean; onToggle: (id: string) => void }) {
  const groups: { jour: number; club: ClubId; debut: number; fin: number; items: Training[]; source: 'planning' | 'ouverture' }[] = [];
  for (let offset = 0; offset < 7; offset++) {
    const jour = (today + offset) % 7;
    for (const c of CLUBS) {
      for (const plage of plagesLibres(c.id, jour)) {
        const items = trainings.filter((t) => t.club === c.id && t.jour === jour && t.debut >= plage.debut && t.debut < plage.fin);
        if (items.length || (clubs.includes(c.id) && offset <= 1)) groups.push({ jour, club: c.id, debut: plage.debut, fin: plage.fin, items, source: plage.source });
      }
    }
  }
  const visible = groups.slice(0, 6);
  if (!visible.length) {
    return (
      <View style={styles.groups}>
        <Body size="bodySmall" tone="dim">
          Aucune plage d’accès libre dans les sept prochains jours pour tes clubs.
        </Body>
      </View>
    );
  }
  return (
    <View style={styles.groups}>
      {visible.map((g) => {
        const c = clubById(g.club);
        return (
          <View key={`${g.club}-${g.jour}-${g.debut}`} style={styles.group}>
            <View style={styles.groupHead}>
              <Display size="display5" tight upper={false}>
                {JOURS_COURTS[g.jour].toUpperCase()} {heure(g.debut)}–{heure(g.fin)}
              </Display>
              <Mono size="micro">
                {c.court.toUpperCase()} · {g.source === 'ouverture' ? 'OUVERT, ACCÈS LIBRE' : 'ACCÈS LIBRE'} · {g.items.length ? `${g.items.length} PROPOSITION${g.items.length > 1 ? 'S' : ''}` : 'LIBRE'}
              </Mono>
            </View>
            {g.items.length ? (
              g.items.map((t) => {
                const type = TRAINING_TYPES.find((x) => x.id === t.type)!;
                const minor = age < 18 && type.sparring;
                return (
                  <View key={t.id} style={styles.proposal}>
                    <View style={styles.pills}>
                      <Pill>{type.label}</Pill>
                      <Pill>{heure(t.debut)}</Pill>
                      <Pill>{t.niveau}</Pill>
                    </View>
                    {t.observation ? (
                      <Body size="bodySmall" tone="muted">
                        {t.observation}
                      </Body>
                    ) : null}
                    <View style={styles.proposalFoot}>
                      <Mono size="micro">
                        {t.organisateur.toUpperCase()} · {t.participants} {t.participants > 1 ? 'MEMBRES' : 'MEMBRE'}
                      </Mono>
                      {actif && !minor ? (
                        <Tap onPress={() => onToggle(t.id)} scaleTo={0.95} style={[styles.join, t.jeParticipe && styles.joinOn]} accessibilityRole="button" accessibilityLabel={t.jeParticipe ? 'Annuler ma participation' : 'Je participe'}>
                          <Body size="caption" weight="bold" caps tone={t.jeParticipe ? 'inverse' : 'text'}>
                            {t.jeParticipe ? 'Inscrit' : 'Je participe'}
                          </Body>
                        </Tap>
                      ) : minor ? (
                        <Mono size="micro">SPARRING : 18 ANS ET PLUS</Mono>
                      ) : null}
                    </View>
                    {type.sparring ? <LowerThird meta="MISE DE GANTS : CASQUE, PROTÈGE-DENTS, GANTS 16 OZ · UN COACH PRÉSENT DANS LA SALLE" compact style={styles.rule} /> : null}
                  </View>
                );
              })
            ) : (
              <Body size="bodySmall" tone="dim">
                Personne n’a encore proposé de séance sur ce créneau. Ta proposition s’écrira ici.
              </Body>
            )}
          </View>
        );
      })}
    </View>
  );
}

function Composer({ age, clubDefault, onPublish }: { age: number; clubDefault: ClubId; onPublish: (t: Training) => void }) {
  const [type, setType] = useState<TrainingType>('training-collectif');
  const [club, setClub] = useState<ClubId>(clubDefault);
  const [jour, setJour] = useState(jourFr(new Date()));
  const [niveau, setNiveau] = useState<Niveau>('Intermédiaire');
  const plages = plagesLibres(club, jour);
  const heures: { id: string; debut: number }[] = plages.flatMap((p) => {
    const out: { id: string; debut: number }[] = [];
    for (let m = p.debut; m + 60 <= p.fin; m += 60) out.push({ id: `${p.id}-${m}`, debut: m });
    return out;
  });
  const [slotIndex, setSlotIndex] = useState(0);
  const slot = heures[Math.min(slotIndex, Math.max(0, heures.length - 1))];
  const types = TRAINING_TYPES.filter((t) => age >= 18 || !t.sparring);

  return (
    <Animated.View entering={FadeIn.duration(duration.cross)} style={styles.composer}>
      <Mono size="micro">COMPOSE TA PROPOSITION</Mono>
      <Row label="Type">
        {types.map((t) => (
          <Choice key={t.id} on={t.id === type} onPress={() => setType(t.id)} label={t.label} />
        ))}
      </Row>
      <Row label="Club">
        {CLUBS.map((c) => (
          <Choice key={c.id} on={c.id === club} onPress={() => { setClub(c.id); setSlotIndex(0); }} label={c.court} />
        ))}
      </Row>
      <Row label="Jour">
        {JOURS.map((j, i) => (
          <Choice key={j} on={i === jour} onPress={() => { setJour(i); setSlotIndex(0); }} label={JOURS_COURTS[i]} />
        ))}
      </Row>
      <Row label="Heure">
        {heures.length ? heures.map((s, i) => <Choice key={s.id} on={i === slotIndex} onPress={() => setSlotIndex(i)} label={heure(s.debut)} />) : <Mono size="micro">CLUB FERMÉ CE JOUR-LÀ</Mono>}
      </Row>
      <Row label="Niveau">
        {(['Débutant', 'Intermédiaire', 'Confirmé'] as Niveau[]).map((n) => (
          <Choice key={n} on={n === niveau} onPress={() => setNiveau(n)} label={n} />
        ))}
      </Row>
      <View style={styles.sentence}>
        <Body size="bodySmall" tone="muted">
          {slot ? (
            <>
              « {TRAINING_TYPES.find((t) => t.id === type)!.label} · {clubById(club).court} · {JOURS[jour].toLowerCase()} {heure(slot.debut)} · {niveau.toLowerCase()} »
            </>
          ) : (
            'Choisis un jour où le club est ouvert.'
          )}
        </Body>
      </View>
      <Tap
        disabled={!slot}
        onPress={() => slot && onPublish({ id: `t-${Date.now()}`, type, club, jour, debut: slot.debut, niveau, organisateur: 'Toi', participants: 1, jeParticipe: true })}
        style={[styles.publish, !slot && styles.publishOff]}
        accessibilityRole="button"
        accessibilityLabel="Publier la proposition">
        <Body weight="bold" tone="inverse">
          Publier
        </Body>
      </Tap>
      <Mono size="micro">SOUMIS À MODÉRATION · RÈGLES DE SÉCURITÉ ET D’ASSURANCE DU CLUB</Mono>
    </Animated.View>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.row}>
      <Mono size="micro" style={styles.rowLabel}>
        {label.toUpperCase()}
      </Mono>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rowChoices}>
        {children}
      </ScrollView>
    </View>
  );
}

function Choice({ on, onPress, label }: { on: boolean; onPress: () => void; label: string }) {
  return (
    <Pressable onPress={onPress} style={[styles.choice, on && styles.choiceOn]} accessibilityRole="button" accessibilityState={{ selected: on }}>
      <Body size="caption" weight="semi" tone={on ? 'inverse' : 'text'}>
        {label}
      </Body>
    </Pressable>
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.pill}>
      <Body size="caption" weight="semi">
        {children}
      </Body>
    </View>
  );
}

const styles = StyleSheet.create({
  head: { paddingHorizontal: space[4], gap: space[1], marginBottom: space[4] },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', marginHorizontal: space[4], paddingBottom: space[2], borderBottomWidth: stroke.hair, borderBottomColor: ink[300] },
  sectionGap: { marginTop: space[7] },
  filtersScroll: { flexGrow: 0, marginTop: space[3] },
  filters: { paddingHorizontal: space[4], gap: space[2], alignItems: 'center' },
  filter: { paddingHorizontal: space[3], paddingVertical: 8, borderRadius: radius.sm, borderWidth: stroke.thin, borderColor: ink[300] },
  filterOn: { backgroundColor: color.text, borderColor: color.text },
  videos: { paddingHorizontal: space[4], marginTop: space[3], gap: space[4] },
  video: { gap: space[2] },
  videoPhoto: { height: 200, borderRadius: radius.sm, justifyContent: 'space-between' },
  videoTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: space[3], gap: space[2] },
  videoTopLeft: { flexShrink: 1 },
  videoBottom: { padding: space[3] },
  videoMeta: { gap: 4 },
  intro: { marginHorizontal: space[4], marginTop: space[2] },
  propose: { marginHorizontal: space[4], marginTop: space[4], backgroundColor: color.text, borderRadius: radius.sm, paddingVertical: 14, alignItems: 'center' },
  lockedBox: { flexDirection: 'row', alignItems: 'center', gap: space[3], marginHorizontal: space[4], marginTop: space[4], padding: space[3], backgroundColor: ink[150], borderRadius: radius.sm },
  groups: { paddingHorizontal: space[4], marginTop: space[5], gap: space[5] },
  group: { gap: space[3] },
  groupHead: { gap: 2, paddingBottom: space[2], borderBottomWidth: stroke.hair, borderBottomColor: ink[300] },
  proposal: { backgroundColor: ink[150], borderRadius: radius.sm, padding: space[3], gap: space[2], borderWidth: stroke.hair, borderColor: whiteAlpha[6] },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  pill: { backgroundColor: whiteAlpha[8], borderRadius: radius.xs, paddingHorizontal: 8, paddingVertical: 4 },
  proposalFoot: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: space[1] },
  join: { borderWidth: stroke.thin, borderColor: color.text, borderRadius: radius.sm, paddingHorizontal: space[3], paddingVertical: 8 },
  joinOn: { backgroundColor: color.text },
  rule: { marginTop: space[1] },
  composer: { marginHorizontal: space[4], marginTop: space[3], backgroundColor: ink[150], borderRadius: radius.sm, padding: space[3], gap: space[3], borderWidth: stroke.hair, borderColor: whiteAlpha[6] },
  row: { gap: 6 },
  rowLabel: {},
  rowChoices: { gap: 6 },
  choice: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: radius.xs, borderWidth: stroke.hair, borderColor: whiteAlpha[12] },
  choiceOn: { backgroundColor: color.text, borderColor: color.text },
  sentence: { paddingTop: space[2], borderTopWidth: stroke.hair, borderTopColor: whiteAlpha[8] },
  publish: { backgroundColor: color.text, borderRadius: radius.sm, paddingVertical: 12, alignItems: 'center' },
  publishOff: { opacity: 0.4 },
});
