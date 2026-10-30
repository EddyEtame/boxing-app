import type { Niveau, PublicTraining, PublicVideo, TrainingType } from '@bc/contract';
import { NIVEAUX, TRAINING_TYPES } from '@bc/contract';
import * as WebBrowser from 'expo-web-browser';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { TextInput, View } from 'react-native';

import { AdminApiError, lireEntrainements, lireLecture, lireVideos, proposerEntrainement } from '@/lib/admin-api';
import { supabase } from '@/lib/supabase';
import { useFeature } from '@/state/features';
import { useT } from '@/i18n';
import { selectStatut, useSession } from '@/state/session';
import { IconPlay, IconUsers } from '@/ui/icons';
import { Button, Card, Row, Section, Segmented } from '@/ui/kit';
import { Page, Reveal } from '@/ui/Page';
import { Body } from '@/ui/Text';
import { makeStyles, space, useTheme } from '@/ui/theme';

type Vue = 'videos' | 'membres';

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

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const jobs: Promise<void>[] = [];
      if (videosOn) {
        jobs.push(
          lireVideos().then((r) => {
            setVideos(r.enabled ? r.items : []);
          }),
        );
      } else setVideos([]);
      if (trainOn) {
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
  }, [clubActif, trainOn, videosOn]);

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
    <Page title={T('train.title')} subtitle={statut === 'invite' ? T('train.subVideos') : vue === 'videos' ? T('train.subVideos') : T('train.subMembers')}>
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
          ) : (
            <View>
              <TrainingList items={trainings} />
              <ProposeForm club={clubActif} onSent={load} />
            </View>
          )}
        </View>
      </Reveal>
    </Page>
  );
}

function VideoList({ items }: { items: PublicVideo[] }) {
  const T = useT();
  const s = useStyles();
  const [note, setNote] = useState('');
  if (!items.length) {
    return (
      <Card>
        <Body tone="muted">{T('train.noVideos')}</Body>
      </Card>
    );
  }
  async function play(id: string) {
    setNote('');
    try {
      const token = supabase ? (await supabase.auth.getSession()).data.session?.access_token : undefined;
      const lecture = await lireLecture(id, token);
      await WebBrowser.openBrowserAsync(lecture.url);
    } catch (err) {
      setNote(err instanceof AdminApiError && err.status === 409 ? T('train.streamOff') : T('train.off'));
    }
  }
  return (
    <Section title={T('train.videos')}>
      <Card padded={false} style={s.list}>
        {items.map((v, i) => (
          <Row
            key={v.id}
            title={v.title}
            subtitle={`${v.niveau} · ${v.dureeMin} min · ${v.objectif}`}
            onPress={() => void play(v.id)}
            last={i === items.length - 1}
          />
        ))}
      </Card>
      {note ? <Body tone="muted" style={s.note}>{note}</Body> : null}
    </Section>
  );
}

function demain(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function ProposeForm({ club, onSent }: { club: PublicTraining['club']; onSent: () => Promise<void> }) {
  const T = useT();
  const s = useStyles();
  const theme = useTheme();
  const me = useSession((st) => st.me);
  const statut = useSession(selectStatut);
  const [type, setType] = useState<TrainingType>('training-collectif');
  const [niveau, setNiveau] = useState<Niveau>('Débutant');
  const [date, setDate] = useState(demain);
  const [heure, setHeure] = useState('18:30');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  if (!me || statut === 'invite') {
    return (
      <Card style={s.note}>
        <Body tone="muted">{T('train.membersOnly')}</Body>
      </Card>
    );
  }
  const member = me;
  async function send() {
    setBusy(true);
    setMessage('');
    try {
      await proposerEntrainement({
        type,
        club,
        date,
        heure,
        niveau,
        organisateur: { memberId: member.id, prenom: member.prenom || 'Membre' },
      });
      setMessage(T('train.sent'));
      await onSent();
    } catch {
      setMessage(T('train.off'));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Card style={s.note}>
      <Body weight="bold">{T('train.compose')}</Body>
      <View style={s.choices}>
        {TRAINING_TYPES.map((item) => (
          <Button key={item} small label={item} variant={item === type ? 'primary' : 'ghost'} onPress={() => setType(item)} />
        ))}
      </View>
      <View style={s.choices}>
        {NIVEAUX.map((item) => (
          <Button key={item} small label={item} variant={item === niveau ? 'primary' : 'ghost'} onPress={() => setNiveau(item)} />
        ))}
      </View>
      <TextInput value={date} onChangeText={setDate} autoCapitalize="none" style={[s.field, { color: theme.text, borderColor: theme.line }]} accessibilityLabel={T('train.day')} />
      <TextInput value={heure} onChangeText={setHeure} autoCapitalize="none" style={[s.field, { color: theme.text, borderColor: theme.line }]} accessibilityLabel={T('train.time')} />
      <Button label={T('train.publish')} onPress={() => void send()} disabled={busy} />
      {message ? <Body tone="muted">{message}</Body> : null}
      <Body size="caption" tone="dim">{T('train.moderated')}</Body>
    </Card>
  );
}

function TrainingList({ items }: { items: PublicTraining[] }) {
  const T = useT();
  const s = useStyles();
  if (!items.length) {
    return (
      <Card>
        <Body tone="muted">{T('train.noProposal')}</Body>
        <Body size="caption" tone="dim" style={s.note}>
          {T('train.emptySlot')}
        </Body>
      </Card>
    );
  }
  return (
    <Section title={T('train.members')}>
      <Card padded={false} style={s.list}>
        {items.map((t, i) => (
          <Row
            key={t.id}
            title={`${t.heure} · ${t.type}`}
            subtitle={`${t.date} · ${t.niveau} · ${T('train.participants', { n: t.participants })} · ${t.organisateur.prenom}`}
            last={i === items.length - 1}
          />
        ))}
      </Card>
    </Section>
  );
}

const useStyles = makeStyles((t) => ({
  block: { marginTop: space[5] },
  list: { paddingHorizontal: space[4] },
  note: { marginTop: space[2] },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2], marginTop: space[3] },
  field: { minHeight: 44, borderWidth: 1, borderRadius: 8, paddingHorizontal: space[3], marginTop: space[3], fontSize: 16 },
}));
