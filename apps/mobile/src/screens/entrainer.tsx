import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, LinearTransition } from 'react-native-reanimated';

import { CLUBS, clubById } from '@/data/clubs';
import { ageOf } from '@/data/member';
import { TRAINING_TYPES, TRAININGS, type Niveau, type Training, type TrainingType } from '@/data/trainings';
import { SECURITE_LABEL, VIDEOS, type Video } from '@/data/videos';
import { familleColor, heure, jourFr, nextSession, plagesLibres, type Famille } from '@/features/planning/model';
import { weekdayIn, WEEKDAYS, WEEKDAYS_SHORT } from '@/features/time';
import { useLocale, useT, type Locale, type MessageKey } from '@/i18n';
import { useSession } from '@/state/session';
import { IconLock, IconPlay, IconUsers } from '@/ui/icons';
import { Button, Card, Chip, Section, Segmented } from '@/ui/kit';
import { LowerThird } from '@/ui/LowerThird';
import { Page, Reveal } from '@/ui/Page';
import { Photo } from '@/ui/Photo';
import { Tap } from '@/ui/Tap';
import { Body, Heading } from '@/ui/Text';
import { duration, GUTTER, makeStyles, radius, space, stagger, stroke, useTheme, type ClubId } from '@/ui/theme';

type Filtre = 'tous' | Famille;
type Vue = 'videos' | 'membres';

const LEVEL_KEY: Record<Niveau, MessageKey> = { Débutant: 'train.levels.debutant', Intermédiaire: 'train.levels.intermediaire', Confirmé: 'train.levels.confirme' };

/** Les guillemets de la langue : « … » avec espaces insécables en français, “…” en anglais. */
const quote = (x: string, lang: Locale) => (lang === 'fr' ? `« ${x} »` : `“${x}”`);

const FILTRES: { id: Filtre; label: string }[] = [
  { id: 'tous', label: 'Tout' },
  { id: 'anglaise', label: 'Anglaise' },
  { id: 'piedsPoings', label: 'Pieds-poings' },
  { id: 'mma', label: 'MMA' },
  { id: 'grappling', label: 'Grappling' },
  { id: 'crossTraining', label: 'Prépa' },
];

/**
 * S'entraîner (CDC §9 et §11) : les vidéos des coachs, et les séances entre
 * membres sur les créneaux d'accès libre. Deux vues, un commutateur en tête :
 * la rubrique membres n'est plus enterrée sous huit vidéos.
 */
export function Screen() {
  const T = useT();
  const s = useStyles();
  const member = useSession((st) => st.member);
  const clubsChoisis = useSession((st) => st.clubsChoisis);
  const now = new Date();
  const age = ageOf(member, now);
  const actif = member.statut === 'actif';
  const next = nextSession(member.clubPrincipal, now, age);
  const [vue, setVue] = useState<Vue>('videos');
  const [filtre, setFiltre] = useState<Filtre>('tous');
  const [trainings, setTrainings] = useState<Training[]>(TRAININGS);
  const [composer, setComposer] = useState(false);
  const videos = orderVideos(filtre, next?.activite.famille);

  return (
    <Page title={T('train.title')} subtitle={vue === 'videos' ? T('train.subVideos') : T('train.subMembers')}>
      <Reveal>
        <Segmented<Vue>
          full
          value={vue}
          onChange={setVue}
          options={[
            { value: 'videos', label: T('train.videos'), icon: IconPlay },
            { value: 'membres', label: T('train.members'), icon: IconUsers },
          ]}
        />
      </Reveal>

      {vue === 'videos' ? (
        <>
          <Reveal delay={60}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filtersScroll} contentContainerStyle={s.filters}>
              {FILTRES.map((f) => (
                <Chip key={f.id} label={f.id === 'tous' ? T('train.all') : f.label} selected={filtre === f.id} onPress={() => setFiltre(f.id)} />
              ))}
            </ScrollView>
            <Body size="caption" weight="semi" tone="muted" style={s.count}>
              {actif ? T('train.countAll', { n: VIDEOS.length }) : T('train.countFree', { n: VIDEOS.filter((v) => v.gratuite).length })}
            </Body>
          </Reveal>
          <Animated.View layout={LinearTransition.duration(duration.cross)} style={s.videos}>
            {videos.map((v, i) => (
              <VideoCard key={v.id} video={v} index={i} locked={!actif && !v.gratuite} first={i === 0 && !!next && v.famille === next.activite.famille} hero={i === 0} />
            ))}
          </Animated.View>
        </>
      ) : (
        <>
          <Reveal delay={60}>
            <Card style={s.rules}>
              <Body size="bodySmall" tone="muted">
                {T('train.rules')}
              </Body>
            </Card>
            {actif ? (
              <Button label={composer ? T('common.close') : T('train.propose')} variant={composer ? 'secondary' : 'primary'} onPress={() => setComposer((c) => !c)} style={s.propose} />
            ) : (
              <Card style={s.locked}>
                <IconLock size={20} />
                <Body size="bodySmall" tone="muted" style={{ flex: 1 }}>
                  {T('train.membersOnly')}
                </Body>
              </Card>
            )}
          </Reveal>
          {composer && actif ? (
            <Composer
              age={age}
              clubDefault={member.clubPrincipal}
              onPublish={(tr) => {
                setTrainings((list) => [tr, ...list]);
                setComposer(false);
              }}
            />
          ) : null}
          <SlotGroups
            trainings={trainings}
            clubs={clubsChoisis}
            today={jourFr(now)}
            age={age}
            actif={actif}
            onToggle={(id) => setTrainings((list) => list.map((tr) => (tr.id === id ? { ...tr, jeParticipe: !tr.jeParticipe, participants: tr.participants + (tr.jeParticipe ? -1 : 1) } : tr)))}
          />
        </>
      )}
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

function VideoCard({ video, index, locked, first, hero }: { video: Video; index: number; locked: boolean; first: boolean; hero: boolean }) {
  const T = useT();
  const s = useStyles();
  const t = useTheme();
  const tint = familleColor(video.famille);
  return (
    <Animated.View entering={FadeInDown.delay(Math.min(index, stagger.max) * stagger.step).duration(420)}>
      <Tap style={s.video} scaleTo={0.98} accessibilityRole="button" accessibilityLabel={video.titre}>
        <Photo source={video.photo} style={[s.videoPhoto, hero && s.videoHero]} darken={locked ? 0.58 : 0.28} scrim={0.6} grain={false}>
          <View style={s.videoTop}>
            <View style={s.badge}>
              <Body size="caption" weight="bold">
                {video.dureeMin} min
              </Body>
            </View>
            {first ? (
              <View style={[s.badge, { backgroundColor: 'rgba(232,0,28,0.85)' }]}>
                <Body size="caption" weight="bold">
                  {T('train.nextSession')}
                </Body>
              </View>
            ) : locked ? (
              <View style={s.badge}>
                <IconLock size={14} />
              </View>
            ) : null}
          </View>
          <View style={s.videoBottom}>
            <Heading level={hero ? 'section' : 'card'} numberOfLines={2} style={{ flex: 1 }}>
              {video.titre}
            </Heading>
            <View style={s.play}>
              <IconPlay size={22} />
            </View>
          </View>
        </Photo>
        <LowerThird meta={`${video.disciplineLabel.toUpperCase()} · ${video.niveau.toUpperCase()} · ${video.objectif.toUpperCase()}${video.securite !== 'seul' ? ' · ' + SECURITE_LABEL[video.securite] : ''}`} bar={video.securite === 'seul' ? tint : t.accent} compact style={s.videoMeta} />
      </Tap>
    </Animated.View>
  );
}

function SlotGroups({ trainings, clubs, today, age, actif, onToggle }: { trainings: Training[]; clubs: ClubId[]; today: number; age: number; actif: boolean; onToggle: (id: string) => void }) {
  const T = useT();
  const s = useStyles();
  const lang = useLocale();
  const groups: { jour: number; club: ClubId; debut: number; fin: number; items: Training[]; source: 'planning' | 'ouverture' }[] = [];
  for (let offset = 0; offset < 7; offset++) {
    const jour = (today + offset) % 7;
    for (const c of CLUBS) {
      for (const plage of plagesLibres(c.id, jour)) {
        const items = trainings.filter((tr) => tr.club === c.id && tr.jour === jour && tr.debut >= plage.debut && tr.debut < plage.fin);
        if (items.length || (clubs.includes(c.id) && offset <= 1)) groups.push({ jour, club: c.id, debut: plage.debut, fin: plage.fin, items, source: plage.source });
      }
    }
  }
  const visible = groups.slice(0, 6);
  if (!visible.length) {
    return (
      <Body size="bodySmall" tone="dim" style={s.groups}>
        {T('train.noSlots')}
      </Body>
    );
  }
  return (
    <View style={s.groups}>
      {visible.map((g) => {
        const c = clubById(g.club);
        return (
          <Reveal key={`${g.club}-${g.jour}-${g.debut}`}>
            <Section title={`${WEEKDAYS[lang][g.jour]} · ${heure(g.debut)}–${heure(g.fin)}`} note={`${c.court} · ${g.source === 'ouverture' ? T('train.openFree') : T('train.free')} · ${g.items.length ? T('train.proposals', { n: g.items.length }) : T('train.noProposal')}`} style={s.groupSection}>
              {g.items.length ? (
                g.items.map((tr) => {
                  const type = TRAINING_TYPES.find((x) => x.id === tr.type)!;
                  const minor = age < 18 && type.sparring;
                  return (
                    <Card key={tr.id} style={s.proposal}>
                      <View style={s.pills}>
                        <Pill>{type.label}</Pill>
                        <Pill>{heure(tr.debut)}</Pill>
                        <Pill>{T(LEVEL_KEY[tr.niveau])}</Pill>
                      </View>
                      {tr.observation ? <Body tone="muted">{tr.observation}</Body> : null}
                      <View style={s.foot}>
                        <Body size="caption" weight="semi" tone="dim" style={{ flex: 1 }}>
                          {tr.organisateur} · {T('train.participants', { n: tr.participants })}
                        </Body>
                        {actif && !minor ? (
                          <Button small label={tr.jeParticipe ? T('train.joined') : T('train.join')} variant={tr.jeParticipe ? 'primary' : 'secondary'} onPress={() => onToggle(tr.id)} />
                        ) : minor ? (
                          <Body size="caption" weight="bold" tone="negative">
                            {T('train.adults')}
                          </Body>
                        ) : null}
                      </View>
                      {type.sparring ? <LowerThird meta={T('train.sparringRule')} compact style={s.rule} /> : null}
                    </Card>
                  );
                })
              ) : (
                <Body size="bodySmall" tone="dim">
                  {T('train.emptySlot')}
                </Body>
              )}
            </Section>
          </Reveal>
        );
      })}
    </View>
  );
}

function Composer({ age, clubDefault, onPublish }: { age: number; clubDefault: ClubId; onPublish: (tr: Training) => void }) {
  const T = useT();
  const s = useStyles();
  const lang = useLocale();
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
  const types = TRAINING_TYPES.filter((x) => age >= 18 || !x.sparring);

  return (
    <Animated.View entering={FadeIn.duration(duration.cross)}>
      <Card style={s.composer}>
        <Heading level="card">{T('train.compose')}</Heading>
        <ChoiceRow label={T('train.type')}>
          {types.map((x) => (
            <Chip key={x.id} label={x.label} selected={x.id === type} onPress={() => setType(x.id)} />
          ))}
        </ChoiceRow>
        <ChoiceRow label={T('train.club')}>
          {CLUBS.map((c) => (
            <Chip
              key={c.id}
              label={c.court}
              selected={c.id === club}
              onPress={() => {
                setClub(c.id);
                setSlotIndex(0);
              }}
            />
          ))}
        </ChoiceRow>
        <ChoiceRow label={T('train.day')}>
          {WEEKDAYS_SHORT[lang].map((j, i) => (
            <Chip
              key={j}
              label={j}
              selected={i === jour}
              onPress={() => {
                setJour(i);
                setSlotIndex(0);
              }}
            />
          ))}
        </ChoiceRow>
        <ChoiceRow label={T('train.time')}>
          {heures.length ? (
            heures.map((h, i) => <Chip key={h.id} label={heure(h.debut)} selected={i === slotIndex} onPress={() => setSlotIndex(i)} />)
          ) : (
            <Body size="bodySmall" tone="muted">
              {T('train.closedDay')}
            </Body>
          )}
        </ChoiceRow>
        <ChoiceRow label={T('train.level')}>
          {(['Débutant', 'Intermédiaire', 'Confirmé'] as Niveau[]).map((n) => (
            <Chip key={n} label={T(LEVEL_KEY[n])} selected={n === niveau} onPress={() => setNiveau(n)} />
          ))}
        </ChoiceRow>
        <Body tone="muted" style={s.sentence}>
          {slot ? quote(`${TRAINING_TYPES.find((x) => x.id === type)!.label} · ${clubById(club).court} · ${weekdayIn(jour, lang)} ${heure(slot.debut)} · ${T(LEVEL_KEY[niveau]).toLowerCase()}`, lang) : T('train.pickOpenDay')}
        </Body>
        <Button
          label={T('train.publish')}
          disabled={!slot}
          onPress={() => slot && onPublish({ id: `t-${Date.now()}`, type, club, jour, debut: slot.debut, niveau, organisateur: T('train.you'), participants: 1, jeParticipe: true })}
        />
        <Body size="caption" tone="dim">
          {T('train.moderated')}
        </Body>
      </Card>
    </Animated.View>
  );
}

function ChoiceRow({ label, children }: { label: string; children: React.ReactNode }) {
  const s = useStyles();
  return (
    <View style={s.choiceRow}>
      <Body size="caption" weight="bold" tone="muted">
        {label}
      </Body>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.choices}>
        {children}
      </ScrollView>
    </View>
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  const s = useStyles();
  return (
    <View style={s.pill}>
      <Body size="caption" weight="bold">
        {children}
      </Body>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  filtersScroll: { flexGrow: 0, marginHorizontal: -GUTTER, marginTop: space[5] },
  filters: { paddingHorizontal: GUTTER, gap: space[2] },
  count: { marginTop: space[3] },
  videos: { marginTop: space[3], gap: space[5] },
  video: { gap: space[2] },
  videoPhoto: { height: 200, borderRadius: radius.card, justifyContent: 'space-between' },
  videoHero: { height: 280 },
  videoTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: space[4] },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.pill, backgroundColor: 'rgba(8,8,8,0.55)' },
  videoBottom: { flexDirection: 'row', alignItems: 'flex-end', gap: space[3], padding: space[4] },
  play: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(245,245,245,0.18)', borderWidth: 1, borderColor: 'rgba(245,245,245,0.35)' },
  videoMeta: { marginHorizontal: space[1] },
  rules: { marginTop: space[5] },
  propose: { marginTop: space[4] },
  locked: { marginTop: space[4], flexDirection: 'row', alignItems: 'center', gap: space[3] },
  groups: { marginTop: space[2] },
  groupSection: { marginTop: space[7] },
  proposal: { gap: space[3], marginBottom: space[3] },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  pill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.pill, backgroundColor: t.chip },
  foot: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
  rule: { marginTop: space[1] },
  composer: { marginTop: space[4], gap: space[4] },
  choiceRow: { gap: space[2] },
  choices: { gap: space[2] },
  sentence: { paddingTop: space[3], borderTopWidth: stroke.hair, borderTopColor: t.line },
}));
