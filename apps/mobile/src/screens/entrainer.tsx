import type { Niveau, PublicTraining, PublicVideo, TrainingParticipant, TrainingType } from '@bc/contract';
import { ageAt, NIVEAUX, TRAINING_TYPES } from '@bc/contract';
import * as WebBrowser from 'expo-web-browser';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { ScrollView, TextInput, View } from 'react-native';

import { CLUBS, clubById } from '@/data/clubs';
import { DISCIPLINES } from '@/data/disciplines';
import { track } from '@/features/analytics';
import { estFerme, heure, isoLocal, jourFr, plagesLibres } from '@/features/planning/model';
import { shortDay, weekdayIn, WEEKDAYS_SHORT } from '@/features/time';
import { AdminApiError, annulerParticipation, lireEntrainements, lireLecture, lireParticipants, lireVideos, participer, proposerEntrainement } from '@/lib/admin-api';
import { supabase } from '@/lib/supabase';
import { useFeature } from '@/state/features';
import { useLocale, useT, type MessageKey } from '@/i18n';
import { selectStatut, useSession } from '@/state/session';
import { IconLock, IconPlanning, IconPlay, IconShield, IconUsers } from '@/ui/icons';
import { Button, Card, Chip, Section, Segmented } from '@/ui/kit';
import { Page, Reveal } from '@/ui/Page';
import { Photo } from '@/ui/Photo';
import { Tap } from '@/ui/Tap';
import { Body, Heading } from '@/ui/Text';
import { makeStyles, radius, space, stroke, useTheme, type ClubId } from '@/ui/theme';

import { ActionsDecouverte } from './common/ActionsDecouverte';
import { MembersOnly } from './common/MembersOnly';
import { Poster } from './home/parts';

type Vue = 'videos' | 'membres';

const AFFICHE_VIDEOS = require('@/assets/photos/portet-sparring.jpg');
const PHOTO_SEANCES = require('@/assets/photos/minimes-groupe-elastiques.jpg');

/** Les types d'entraînement du CDC §11. */
const TYPE_KEY: Record<TrainingType, MessageKey> = {
  'sparring-anglaise': 'train.types.anglaise',
  'sparring-pieds-poings': 'train.types.piedsPoings',
  'sparring-sol': 'train.types.sol',
  'training-collectif': 'train.types.collectif',
  footing: 'train.types.footing',
};
const NIVEAU_KEY: Record<Niveau, MessageKey> = { Débutant: 'train.levels.debutant', Intermédiaire: 'train.levels.intermediaire', Confirmé: 'train.levels.confirme' };
const JOURS_PROPOSES = 14;

/** Videos coachs et seances entre membres (GET admin). */
export function Screen() {
  const T = useT();
  const s = useStyles();
  const statut = useSession(selectStatut);
  const clubActif = useSession((st) => st.clubActif);
  const videosOn = useFeature('videos');
  const trainOn = useFeature('entrainements');
  const defaultVue: Vue = videosOn ? 'videos' : 'membres';
  const [vue, setVue] = useState<Vue>(defaultVue);
  const [videos, setVideos] = useState<PublicVideo[]>([]);
  const [trainings, setTrainings] = useState<PublicTraining[]>([]);
  const [loading, setLoading] = useState(true);

  const tabs = useMemo(() => {
    const opts: { value: Vue; label: string; icon: typeof IconPlay }[] = [];
    if (videosOn) opts.push({ value: 'videos', label: T('train.videos'), icon: IconPlay });
    if (trainOn) opts.push({ value: 'membres', label: T('train.members'), icon: IconUsers });
    return opts;
  }, [T, videosOn, trainOn]);

  useEffect(() => {
    if (!tabs.some((t) => t.value === vue)) setVue(tabs[0]?.value ?? 'videos');
  }, [tabs, vue]);

  const load = useCallback(async (discret = false) => {
    if (!discret) setLoading(true);
    try {
      const jobs: Promise<void>[] = [];
      if (videosOn) {
        jobs.push(
          lireVideos().then((r) => {
            setVideos(r.enabled ? r.items : []);
          }),
        );
      } else setVideos([]);
      if (trainOn && statut === 'actif') {
        jobs.push(
          lireEntrainements(clubActif).then((r) => {
            setTrainings(r.off ? [] : r.items);
          }),
        );
      } else setTrainings([]);
      await Promise.all(jobs);
    } catch {
      setVideos([]);
      setTrainings([]);
    } finally {
      setLoading(false);
    }
  }, [clubActif, statut, trainOn, videosOn]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!videosOn && !trainOn) {
    return (
      <Page title={T('train.title')} subtitle={T('train.subVideos')}>
        <Reveal>
          <Card>
            <Body tone="muted">{T('train.off')}</Body>
          </Card>
        </Reveal>
      </Page>
    );
  }

  return (
    <Page title={T('train.title')} subtitle={vue === 'videos' ? T('train.subVideos') : T('train.subMembers')}>
      {tabs.length > 1 ? (
        <Reveal>
          <Segmented<Vue> full value={vue} onChange={setVue} options={tabs} />
        </Reveal>
      ) : null}
      <Reveal>
        <View style={s.block}>
          {loading ? (
            <Card>
              <Body tone="muted">{T('common.loading')}</Body>
            </Card>
          ) : vue === 'videos' ? (
            <VideoList items={videos} />
          ) : statut === 'actif' ? (
            <View style={s.seances}>
              <TrainingList items={trainings} />
              <ProposeForm clubDefaut={clubActif} onSent={() => load(true)} />
            </View>
          ) : (
            <MembersOnly
              title={T('train.lockedTitle')}
              body={statut === 'restreint' ? T('train.lockedRestricted') : T('train.lockedGuest')}
              restricted={statut === 'restreint'}
              photo={PHOTO_SEANCES}
              atouts={[
                { icon: IconUsers, title: T('train.perk1'), sub: T('train.perk1Sub') },
                { icon: IconPlanning, title: T('train.perk2'), sub: T('train.perk2Sub') },
                { icon: IconShield, title: T('train.perk3'), sub: T('train.perk3Sub') },
              ]}
            />
          )}
        </View>
      </Reveal>
    </Page>
  );
}

function VideoList({ items }: { items: PublicVideo[] }) {
  const T = useT();
  const s = useStyles();
  const statut = useSession(selectStatut);
  const [note, setNote] = useState<{ id: string; texte: string } | null>(null);
  if (!items.length) {
    return (
      <Poster index={0} height={320} photo={AFFICHE_VIDEOS} cornerLeft={T('train.videos')} cornerRight={T('train.waitClub')} title={T('train.waitTitle')} sub={T('train.waitBody')} meta={T('train.waitMeta')} />
    );
  }
  const abonne = statut === 'actif';
  async function play(v: PublicVideo) {
    setNote(null);
    if (!abonne && !v.gratuite) {
      setNote({ id: v.id, texte: T('train.videoLocked') });
      return;
    }
    try {
      track('video_open', { famille: v.famille });
      const token = supabase ? (await supabase.auth.getSession()).data.session?.access_token : undefined;
      const lecture = await lireLecture(v.id, token);
      await WebBrowser.openBrowserAsync(lecture.url);
    } catch (err) {
      const code = err instanceof AdminApiError ? err.status : 0;
      setNote({ id: v.id, texte: code === 409 ? T('train.streamOff') : code === 401 || code === 403 ? T('train.videoLocked') : T('train.off') });
    }
  }
  return (
    <View style={s.videos}>
      {items.map((v) => (
        <View key={v.id} style={s.videoBloc}>
          <VideoCard video={v} verrou={!abonne && !v.gratuite} onPress={() => void play(v)} />
          {note?.id === v.id ? <Body size="bodySmall" tone="muted">{note.texte}</Body> : null}
        </View>
      ))}
      {!abonne && items.some((v) => !v.gratuite) ? (
        <Card style={s.seances}>
          <Body tone="muted">{T('train.lockedVideos')}</Body>
          <ActionsDecouverte from="entrainer" />
        </Card>
      ) : null}
    </View>
  );
}

/** Une vidéo : son image, ou à défaut la photo de sa discipline. */
function VideoCard({ video, verrou, onPress }: { video: PublicVideo; verrou: boolean; onPress: () => void }) {
  const T = useT();
  const s = useStyles();
  const repli = DISCIPLINES.find((d) => d.famille === video.famille)?.photo ?? AFFICHE_VIDEOS;
  return (
    <Tap onPress={onPress} scaleTo={0.985} accessibilityRole="button" accessibilityLabel={video.title}>
      <Photo source={video.poster ? { uri: video.poster.url } : repli} style={s.video} darken={0.36} scrim={0.8}>
        <View style={s.videoBas}>
          <View style={s.lecture}>{verrou ? <IconLock size={20} color="#F5F5F5" /> : <IconPlay size={20} color="#F5F5F5" />}</View>
          <View style={s.videoTexte}>
            <Heading level="card" numberOfLines={2}>
              {video.title}
            </Heading>
            <Body size="caption" weight="bold" tone="muted">
              {T(NIVEAU_KEY[video.niveau])} · {video.dureeMin} min · {video.objectif}
            </Body>
          </View>
        </View>
      </Photo>
    </Tap>
  );
}

/** Ce que le serveur a refusé, en clair. */
function refus(err: unknown, T: ReturnType<typeof useT>): string {
  const code = err instanceof AdminApiError ? err.code : null;
  if (code === 'age') return T('train.ageBlocked');
  if (code === 'coupee') return T('train.typeOff');
  if (code === 'passee') return T('train.started');
  if (code === 'champs' || code === 'invalide') return T('train.invalid');
  if (code === 'debit') return T('train.tooMany');
  return T('train.off');
}

function prochainsJours(): Date[] {
  const auj = new Date();
  return Array.from({ length: JOURS_PROPOSES }, (_, i) => new Date(auj.getFullYear(), auj.getMonth(), auj.getDate() + i));
}

function hhmm(minutes: number): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(Math.floor(minutes / 60))}:${p(minutes % 60)}`;
}

function ChoiceRow({ label, children }: { label: string; children: ReactNode }) {
  const s = useStyles();
  return (
    <View style={s.choix}>
      <Body size="caption" weight="bold" tone="muted">
        {label}
      </Body>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.choixLigne}>
        {children}
      </ScrollView>
    </View>
  );
}

/**
 * Proposer un entraînement (CDC §11 A) : le club, la date, une heure prise dans
 * l'accès libre de ce club, le type et des observations facultatives.
 */
function ProposeForm({ clubDefaut, onSent }: { clubDefaut: ClubId; onSent: () => Promise<void> }) {
  const T = useT();
  const s = useStyles();
  const t = useTheme();
  const lang = useLocale();
  const me = useSession((st) => st.me);
  const [type, setType] = useState<TrainingType>('training-collectif');
  const [club, setClub] = useState<ClubId>(clubDefaut);
  const [decalage, setDecalage] = useState(1);
  const [creneau, setCreneau] = useState(0);
  const [niveau, setNiveau] = useState<Niveau>('Débutant');
  const [observation, setObservation] = useState('');
  const [retour, setRetour] = useState('');
  const [busy, setBusy] = useState(false);
  if (!me) return null;
  const member = me;
  const age = ageAt(member.dateNaissance);
  const types = TRAINING_TYPES.filter((x) => age >= 18 || !x.startsWith('sparring'));
  const jours = prochainsJours();
  const jour = jours[decalage];
  const maintenant = new Date();
  const minuteCourante = maintenant.getHours() * 60 + maintenant.getMinutes();
  const ferme = estFerme(club, isoLocal(jour));
  const heures = (ferme ? [] : plagesLibres(club, jourFr(jour))).flatMap((p) => {
    const out: number[] = [];
    for (let m = p.debut; m + 60 <= p.fin; m += 60) if (decalage > 0 || m > minuteCourante) out.push(m);
    return out;
  });
  const debut = heures.length ? heures[Math.min(creneau, heures.length - 1)] : null;

  async function send() {
    if (debut === null) return;
    setBusy(true);
    setRetour('');
    try {
      const obs = observation.trim();
      const creee = await proposerEntrainement({
        type,
        club,
        date: isoLocal(jour),
        heure: hhmm(debut),
        niveau,
        ...(obs ? { observation: obs } : {}),
        organisateur: { memberId: member.id, prenom: member.prenom || 'Membre', age },
      });
      track('training_publish', { club, choice: type });
      setObservation('');
      setRetour(creee.status === 'en-ligne' ? T('train.published') : T('train.sent'));
      await onSent();
    } catch (err) {
      setRetour(refus(err, T));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card style={s.formulaire}>
      <Heading level="card">{T('train.compose')}</Heading>
      <ChoiceRow label={T('train.club')}>
        {CLUBS.map((c) => (
          <Chip
            key={c.id}
            label={c.court}
            selected={c.id === club}
            onPress={() => {
              setClub(c.id);
              setCreneau(0);
            }}
          />
        ))}
      </ChoiceRow>
      <ChoiceRow label={T('train.day')}>
        {jours.map((d, i) => (
          <Chip
            key={d.getTime()}
            label={`${WEEKDAYS_SHORT[lang][jourFr(d)]} ${d.getDate()}`}
            selected={i === decalage}
            onPress={() => {
              setDecalage(i);
              setCreneau(0);
            }}
          />
        ))}
      </ChoiceRow>
      <ChoiceRow label={T('train.time')}>
        {heures.length ? (
          heures.map((m, i) => <Chip key={m} label={heure(m)} selected={m === debut} onPress={() => setCreneau(i)} />)
        ) : (
          <Body size="bodySmall" tone="muted">
            {ferme ? T('train.closedDay') : T('train.noSlotDay')}
          </Body>
        )}
      </ChoiceRow>
      <ChoiceRow label={T('train.type')}>
        {types.map((x) => (
          <Chip key={x} label={T(TYPE_KEY[x])} selected={x === type} onPress={() => setType(x)} />
        ))}
      </ChoiceRow>
      <ChoiceRow label={T('train.level')}>
        {NIVEAUX.map((n) => (
          <Chip key={n} label={T(NIVEAU_KEY[n])} selected={n === niveau} onPress={() => setNiveau(n)} />
        ))}
      </ChoiceRow>
      <View style={s.choix}>
        <Body size="caption" weight="bold" tone="muted">
          {T('train.observation')}
        </Body>
        <TextInput
          value={observation}
          onChangeText={setObservation}
          placeholder={T('train.observationPh')}
          placeholderTextColor={t.textDim}
          multiline
          maxLength={280}
          style={[s.observation, { color: t.text, borderColor: t.line }]}
          accessibilityLabel={T('train.observation')}
        />
      </View>
      {debut !== null ? (
        <Body size="bodySmall" tone="muted" style={s.recap}>
          {T(TYPE_KEY[type])} · {clubById(club).court} · {weekdayIn(jourFr(jour), lang)} {heure(debut)} · {T(NIVEAU_KEY[niveau]).toLowerCase()}
        </Body>
      ) : null}
      <Button label={T('train.publish')} onPress={() => void send()} disabled={busy || debut === null} />
      {retour ? <Body tone="muted">{retour}</Body> : null}
      <Body size="caption" tone="dim">
        {T('train.moderated')}
      </Body>
    </Card>
  );
}

function TrainingList({ items }: { items: PublicTraining[] }) {
  const T = useT();
  const s = useStyles();
  if (!items.length) {
    return (
      <Card>
        <Heading level="card">{T('train.firstTitle')}</Heading>
        <Body size="bodySmall" tone="muted" style={s.note}>
          {T('train.firstBody')}
        </Body>
      </Card>
    );
  }
  return (
    <Section title={T('train.members')}>
      <Card padded={false} style={s.list}>
        {items.map((e, i) => (
          <Proposition key={e.id} e={e} last={i === items.length - 1} />
        ))}
      </Card>
    </Section>
  );
}

/**
 * Une proposition (CDC §11 B, C) : « Je participe », l'annulation, et pour son
 * organisateur les prénoms des inscrits. Pas de contact ni de conversation (§11 D).
 */
function Proposition({ e, last }: { e: PublicTraining; last: boolean }) {
  const T = useT();
  const s = useStyles();
  const t = useTheme();
  const lang = useLocale();
  const [inscrit, setInscrit] = useState(e.moi?.inscrit ?? false);
  const [participants, setParticipants] = useState(e.participants);
  const [inscrits, setInscrits] = useState<TrainingParticipant[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');

  async function repondre() {
    setBusy(true);
    setNote('');
    try {
      const res = await (inscrit ? annulerParticipation(e.id) : participer(e.id));
      setInscrit(res.inscrit);
      setParticipants(res.participants);
      if (res.inscrit) track('training_join', { club: e.club, choice: e.type });
    } catch (err) {
      setNote(refus(err, T));
    } finally {
      setBusy(false);
    }
  }

  async function voirInscrits() {
    setBusy(true);
    setNote('');
    try {
      setInscrits((await lireParticipants(e.id)).items);
    } catch (err) {
      setNote(refus(err, T));
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={[s.proposition, !last && { borderBottomWidth: stroke.hair, borderBottomColor: t.line }]}>
      <Body weight="bold">{T(TYPE_KEY[e.type])}</Body>
      <Body size="bodySmall" tone="muted">
        {shortDay(e.date, lang)} · {heure(e.debut)} · {T(NIVEAU_KEY[e.niveau])}
      </Body>
      {e.observation ? <Body size="bodySmall">{e.observation}</Body> : null}
      <Body size="caption" weight="semi" tone="dim">
        {e.organisateur.prenom} · {T('train.participants', { n: participants })}
      </Body>
      {e.moi?.organisateur ? (
        inscrits ? (
          <Body size="bodySmall" weight="semi">
            {inscrits.length ? inscrits.map((p) => p.prenom).join(', ') : T('train.noParticipants')}
          </Body>
        ) : (
          <Button small variant="ghost" label={T('train.seeParticipants')} disabled={busy} onPress={() => void voirInscrits()} style={s.geste} />
        )
      ) : e.moi ? (
        <Button small variant={inscrit ? 'secondary' : 'primary'} label={inscrit ? T('train.leave') : T('train.join')} disabled={busy} onPress={() => void repondre()} style={s.geste} />
      ) : null}
      {note ? (
        <Body size="caption" tone="negative">
          {note}
        </Body>
      ) : null}
    </View>
  );
}

const useStyles = makeStyles(() => ({
  block: { marginTop: space[5] },
  seances: { gap: space[4] },
  list: { paddingHorizontal: space[4] },
  note: { marginTop: space[2] },
  videos: { gap: space[4] },
  videoBloc: { gap: space[2] },
  video: { height: 196, borderRadius: radius.card, justifyContent: 'flex-end' },
  videoBas: { flexDirection: 'row', alignItems: 'flex-end', gap: space[3], padding: space[4] },
  videoTexte: { flex: 1, gap: 3 },
  lecture: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(245,245,245,0.18)' },
  formulaire: { gap: space[4] },
  choix: { gap: space[2] },
  choixLigne: { gap: space[2], alignItems: 'center' },
  observation: { minHeight: 84, borderWidth: 1, borderRadius: radius.control, paddingHorizontal: space[3], paddingTop: space[3], textAlignVertical: 'top', fontSize: 16 },
  recap: { paddingTop: space[3] },
  proposition: { gap: 3, paddingVertical: space[4] },
  geste: { alignSelf: 'flex-start', marginTop: space[2] },
}));
