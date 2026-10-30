import type { PublicTraining, PublicVideo } from '@bc/contract';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';

import { lireEntrainements, lireVideos } from '@/lib/admin-api';
import { useFeature } from '@/state/features';
import { useT } from '@/i18n';
import { selectStatut, useSession } from '@/state/session';
import { IconPlay, IconUsers } from '@/ui/icons';
import { Card, Row, Section, Segmented } from '@/ui/kit';
import { Page, Reveal } from '@/ui/Page';
import { Body } from '@/ui/Text';
import { makeStyles, space } from '@/ui/theme';

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
            <TrainingList items={trainings} />
          )}
        </View>
      </Reveal>
    </Page>
  );
}

function VideoList({ items }: { items: PublicVideo[] }) {
  const T = useT();
  const s = useStyles();
  if (!items.length) {
    return (
      <Card>
        <Body tone="muted">{T('train.noVideos')}</Body>
      </Card>
    );
  }
  return (
    <Section title={T('train.videos')}>
      <Card padded={false} style={s.list}>
        {items.map((v, i) => (
          <Row
            key={v.id}
            title={v.title}
            subtitle={`${v.niveau} · ${v.dureeMin} min · ${v.objectif}`}
            last={i === items.length - 1}
          />
        ))}
      </Card>
    </Section>
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
}));
