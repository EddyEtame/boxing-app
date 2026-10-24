'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState, useTransition } from 'react';

import { restoreSession } from './actions';
import { ControlsView } from './ControlsView';
import { HoursView } from './HoursView';
import { MemberPreview } from './MemberPreview';
import { NetworkDay } from './NetworkDay';
import { HistoryPanel, SourceStrip, type SourceView } from './PlanningSide';
import { PosterGrid } from './PosterGrid';
import { SlotDrawer, motifLabel } from './SlotDrawer';
import { AddWizard, CancelWizard, ClosureWizard, MoveWizard, type AddState } from './SlotWizards';
import { IconBan, IconCalendarOff, IconChevron, IconClose, IconDownload, IconMove, IconPlus, IconPrint } from '@/components/icons';
import { PageHeader } from '@/components/PageHeader';
import { DataTable, type Column } from '@/components/table/DataTable';
import { useToast } from '@/components/Toast';
import { useNow } from '@/components/useNow';
import { Segmented } from '@/components/wizard/fields';
import { useI18n } from '@/i18n/client';
import type { MessageKey } from '@/i18n/messages';
import { CLUB_IDS, CLUB_LABEL, CLUB_PHOTO, photoThumb } from '@/lib/clubs';
import { fmtDate } from '@/lib/format';
import { closureOn, hoursOf } from '@/lib/planning/hours';
import { addDaysYmd, duree, espacesFor, familleColor, heure, isFree, jourOf, mondayOf, normaliseActivite } from '@/lib/planning/model';
import { VIEWS, type View } from '@/lib/planning/views';
import type { ClubId, Closure, Famille, PlanningChange, PlanningState, Slot, SlotException } from '@/lib/types';


type Open = { kind: 'ajout'; start?: Partial<AddState> } | { kind: 'deplacement'; slot?: Slot | null } | { kind: 'annulation'; slot?: Slot | null; date?: string; scope?: 'date' | 'retrait' } | { kind: 'fermeture' } | null;

export type PlanningProps = {
  slots: Slot[];
  exceptions: SlotException[];
  history: PlanningChange[];
  horaires: PlanningState['horaires'];
  horairesSource: PlanningState['horairesSource'];
  closures: Closure[];
  source: SourceView;
  canEdit: boolean;
  editable: ClubId[];
  canTake: boolean;
  today: string;
  initial: { club: ClubId; espace: string; view: View; week: string; nouveau: string | null; coach: string | null; jour: number | null; slot: string | null };
};

/** Minutes depuis minuit à Toulouse, pour la bande « en cours ». */
function parisMinutes(ms: number): number {
  const parts = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(ms);
  const h = Number(parts.find((p) => p.type === 'hour')?.value ?? 0);
  const m = Number(parts.find((p) => p.type === 'minute')?.value ?? 0);
  return h * 60 + m;
}

const ymdJour = (ymd: string) => {
  const [y, m, d] = ymd.split('-').map(Number);
  return jourOf(new Date(y, m - 1, d, 12));
};

export function PlanningView({ slots, exceptions, history, horaires, horairesSource, closures, source, canEdit, editable, canTake, today, initial }: PlanningProps) {
  const { t, locale } = useI18n();
  const toast = useToast();
  const router = useRouter();
  const now = useNow(30_000);
  const [club, setClub] = useState<ClubId>(initial.club);
  const [espace, setEspace] = useState(initial.espace);
  const [view, setView] = useState<View>(initial.view);
  const [week, setWeek] = useState(initial.week);
  const [coach, setCoach] = useState<string | null>(initial.coach);
  const [netDay, setNetDay] = useState<number>(initial.jour ?? ymdJour(today));
  // ?cours=<id> (palette, fiche partagée) : la fiche du cours s'ouvre directement.
  const [openSlot, setOpenSlot] = useState<string | null>(initial.slot);
  // « Créer » (palette, Aujourd'hui) arrive ici avec ?nouveau=… : l'assistant est ouvert dès le premier rendu.
  const [wizard, setWizard] = useState<Open>(() => {
    if (!canEdit || !initial.nouveau) return null;
    const k = initial.nouveau;
    if (k === 'ajout') return { kind: 'ajout', start: editable.includes(initial.club) ? { club: initial.club } : undefined };
    if (k === 'deplacement') return { kind: 'deplacement' };
    if (k === 'annulation') return { kind: 'annulation' };
    if (k === 'fermeture') return { kind: 'fermeture' };
    return null;
  });
  const [, start] = useTransition();
  const thisWeek = mondayOf(today);
  const weekDates = useMemo(() => [0, 1, 2, 3, 4, 5, 6].map((i) => addDaysYmd(week, i)), [week]);
  const isThisWeek = week === thisWeek;
  const todayJour = isThisWeek ? ymdJour(today) : null;
  const nowMin = now === null ? null : parisMinutes(now);
  const espaces = useMemo(() => espacesFor(slots, club), [slots, club]);
  const shownEspace = espaces.includes(espace) ? espace : '';
  const canEditClub = canEdit && editable.includes(club);
  const slot = openSlot ? (slots.find((s) => s.id === openSlot) ?? null) : null;
  // Les jours fermés de la semaine montrée : sur l'affiche, l'accès libre y tombe avec les cours.
  const closedJours = useMemo(() => new Set(weekDates.flatMap((d, j) => (closureOn(closures, club, d) ? [j] : []))), [weekDates, closures, club]);

  // L'adresse suit la vue : un lien copié rouvre le même club, la même semaine, la même vue.
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const q = new URLSearchParams();
    q.set('club', club);
    if (view !== 'affiche') q.set('vue', view);
    if (shownEspace) q.set('espace', shownEspace);
    if (!isThisWeek) q.set('semaine', week);
    if (coach) q.set('coach', coach);
    if (view === 'reseau') q.set('jour', String(netDay));
    window.history.replaceState(null, '', `/plannings?${q.toString()}`);
  }, [club, view, shownEspace, week, isThisWeek, coach, netDay]);

  // L'adresse oublie ?nouveau= aussitôt : un rafraîchissement après l'enregistrement ne rouvre pas l'assistant.
  useEffect(() => {
    if (!initial.nouveau) return;
    const q = new URLSearchParams(window.location.search);
    q.delete('nouveau');
    window.history.replaceState(null, '', `/plannings${q.size ? `?${q.toString()}` : ''}`);
  }, [initial.nouveau]);

  const perClub = useMemo(() => {
    const out = new Map<ClubId, { n: number; min: number }>();
    for (const c of CLUB_IDS) out.set(c, { n: 0, min: 0 });
    for (const s of slots) {
      if (isFree(s)) continue;
      const cur = out.get(s.club)!;
      cur.n++;
      cur.min += s.fin - s.debut;
    }
    return out;
  }, [slots]);

  const familles = useMemo(() => {
    const set = new Set<Famille>();
    for (const s of slots) if (s.club === club && (!shownEspace || !s.espace || s.espace === shownEspace)) set.add(normaliseActivite(s.activite).famille);
    return [...set].filter((f) => f !== 'accesLibre');
  }, [slots, club, shownEspace]);

  const restore = (e: SlotException) =>
    start(async () => {
      const res = await restoreSession(e.id);
      if (!res.ok) {
        toast({ text: t(`err.${res.error}` as MessageKey), kind: 'err' });
        return;
      }
      toast({ text: t('planning.done.restored'), kind: 'ok' });
      router.refresh();
    });

  const closeWizard = () => setWizard(null);
  const openMove = (s?: Slot | null) => {
    setOpenSlot(null);
    setWizard({ kind: 'deplacement', slot: s ?? null });
  };
  const openCancel = (s?: Slot | null, date?: string) => {
    setOpenSlot(null);
    setWizard({ kind: 'annulation', slot: s ?? null, date, scope: 'date' });
  };
  const openRemove = (s: Slot) => {
    setOpenSlot(null);
    setWizard({ kind: 'annulation', slot: s, scope: 'retrait' });
  };

  const weekLabel = t('planning.week', { from: fmtDate(locale, weekDates[0], { day: 'numeric', month: 'short' }), to: fmtDate(locale, weekDates[6], { day: 'numeric', month: 'short' }) });
  const sameMonth = weekDates[0].slice(5, 7) === weekDates[6].slice(5, 7);
  const weekShort = `${fmtDate(locale, weekDates[0], sameMonth ? { day: 'numeric' } : { day: 'numeric', month: 'short' })} – ${fmtDate(locale, weekDates[6], { day: 'numeric', month: 'short' })}`;
  const upcoming = (s: Slot) => exceptions.filter((e) => e.slotId === s.id && e.date >= today).sort((a, b) => a.date.localeCompare(b.date));

  const listRows = slots.filter((s) => s.club === club && (!shownEspace || !s.espace || s.espace === shownEspace));
  const columns: Column<Slot>[] = [
    { id: 'jour', header: t('planning.c.day'), cell: (s) => t(`day.${s.jour}` as MessageKey), sortValue: (s) => s.jour * 1440 + s.debut },
    { id: 'heure', header: t('planning.c.time'), cell: (s) => `${heure(s.debut)}–${heure(s.fin)}`, sortValue: (s) => s.debut },
    { id: 'duree', header: t('planning.c.duration'), num: true, cell: (s) => duree(s.fin - s.debut), sortValue: (s) => s.fin - s.debut },
    {
      id: 'activite',
      header: t('planning.c.activity'),
      cell: (s) => (
        <span className="cell-activity">
          <span className="course-dot" style={{ background: familleColor(normaliseActivite(s.activite).famille) }} aria-hidden="true" />
          <span>
            <span className="row-title">{s.activite}</span>
            <span className="row-sub">{(({ libelle, public: pub, niveau }) => [libelle, pub, niveau].filter(Boolean).join(' · '))(normaliseActivite(s.activite))}</span>
          </span>
        </span>
      ),
      sortValue: (s) => s.activite,
    },
    ...(espaces.length ? [{ id: 'espace', header: t('planning.c.espace'), cell: (s: Slot) => s.espace ?? '—', sortValue: (s: Slot) => s.espace ?? '' }] : []),
    { id: 'coach', header: t('planning.c.coach'), cell: (s) => (s.coach && s.coach !== 'ACCES LIBRE' ? s.coach : <span className="muted">{isFree(s) ? '—' : t('planning.noCoach')}</span>), sortValue: (s) => s.coach ?? '' },
    {
      id: 'annul',
      header: t('planning.c.cancels'),
      cell: (s) => {
        const u = upcoming(s);
        return u.length ? (
          <span className="tag tag-neg" title={u.map((e) => `${e.date} · ${motifLabel(t, e.motif)}`).join('\n')}>
            {fmtDate(locale, u[0].date, { day: 'numeric', month: 'short' })}
            {u.length > 1 ? ` +${u.length - 1}` : ''}
          </span>
        ) : (
          ''
        );
      },
      sortValue: (s) => upcoming(s)[0]?.date ?? '9999',
    },
  ];

  return (
    <>
      <PageHeader
        kicker={t('planning.kicker')}
        title={t('planning.title')}
        lead={t('planning.lead', { n: slots.filter((s) => !isFree(s)).length })}
        actions={
          canEdit ? (
            <>
              <button type="button" className="btn btn-primary" onClick={() => setWizard({ kind: 'ajout', start: canEditClub ? { club } : undefined })}>
                <IconPlus size={18} />
                {t('planning.act.add')}
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => openMove(null)}>
                <IconMove size={18} />
                {t('planning.act.move')}
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => openCancel(null)}>
                <IconBan size={18} />
                {t('planning.act.cancel')}
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => setWizard({ kind: 'fermeture' })}>
                <IconCalendarOff size={18} />
                {t('planning.act.close')}
              </button>
            </>
          ) : null
        }
      />

      <div className="stack plan-page" style={{ '--gap': '18px' } as React.CSSProperties}>
        <SourceStrip source={source} canTake={canTake} />

        <nav className="club-tabs" aria-label={t('planning.clubs')}>
          {CLUB_IDS.map((c) => {
            const k = perClub.get(c)!;
            return (
              <button key={c} type="button" className="club-tab" aria-pressed={c === club} onClick={() => setClub(c)}>
                {/* eslint-disable-next-line @next/next/no-img-element -- photothèque locale, vignette réduite par Next */}
                <img src={photoThumb(CLUB_PHOTO[c], 96)} alt="" width={44} height={44} className="club-tab-photo" />
                <span className="club-tab-text">
                  <b>{CLUB_LABEL[c]}</b>
                  <small>
                    {t('planning.clubTab', { n: k.n, h: duree(k.min) })}
                    {coach ? ` · ${t('planning.coachHere', { n: slots.filter((s) => s.club === c && (s.coach ?? '').toUpperCase() === coach.toUpperCase()).length })}` : ''}
                  </small>
                </span>
              </button>
            );
          })}
        </nav>

        <div className="plan-bar">
          <Segmented<View> value={view} onChange={setView} label={t('planning.views')} options={VIEWS.map((v) => ({ value: v, label: t(`planning.view.${v}` as MessageKey) }))} />
          {espaces.length && view !== 'reseau' && view !== 'controles' && view !== 'horaires' ? (
            <Segmented<string> value={shownEspace || '__all'} onChange={(v) => setEspace(v === '__all' ? '' : v)} label={t('planning.f.espace')} options={[{ value: '__all', label: t('planning.espaces.all') }, ...espaces.map((e) => ({ value: e, label: e }))]} />
          ) : null}
          {view !== 'controles' && view !== 'horaires' ? (
            <div className="week-nav" role="group" aria-label={t('planning.weekNav')}>
              <button type="button" className="btn btn-ghost btn-sm btn-icon" onClick={() => setWeek(addDaysYmd(week, -7))} aria-label={t('planning.prevWeek')}>
                <IconChevron size={18} style={{ transform: 'rotate(180deg)' }} />
              </button>
              <span className="week-label" aria-live="polite" title={weekLabel}>
                <span className="sr-only">{weekLabel}</span>
                <span aria-hidden="true">{weekShort}</span>
              </span>
              <button type="button" className="btn btn-ghost btn-sm btn-icon" onClick={() => setWeek(addDaysYmd(week, 7))} aria-label={t('planning.nextWeek')}>
                <IconChevron size={18} />
              </button>
              {!isThisWeek ? (
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setWeek(thisWeek)}>
                  {t('planning.thisWeek')}
                </button>
              ) : null}
            </div>
          ) : null}
          {coach ? (
            <span className="coach-focus">
              {t('planning.focus', { name: coach })}
              <button type="button" className="btn btn-ghost btn-sm btn-icon" onClick={() => setCoach(null)} aria-label={t('planning.focus.clear')}>
                <IconClose size={14} />
              </button>
            </span>
          ) : null}
          <a className="btn btn-ghost btn-sm" style={{ marginLeft: 'auto' }} href={`/api/admin/plannings-csv?club=${club}`} download>
            <IconDownload size={16} />
            <span className="hide-sm">{t('planning.csv')}</span>
          </a>
        </div>

        {view === 'affiche' ? (
          <section className="panel poster-panel print-area" aria-labelledby="poster-title">
            <div className="poster-head">
              <div>
                <p className="eyebrow">{weekLabel}</p>
                <h2 id="poster-title" className="poster-club">
                  {CLUB_LABEL[club]}
                  {shownEspace ? <span> · {shownEspace}</span> : null}
                </h2>
              </div>
              <div className="poster-tools">
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => window.print()}>
                  <IconPrint size={16} />
                  <span className="hide-sm">{t('planning.print')}</span>
                </button>
              </div>
            </div>
            <div className="poster-legend-row">
              <ul className="legend" aria-label={t('planning.legend')}>
                {familles.map((f) => (
                  <li key={f}>
                    <span className="swatch" style={{ background: familleColor(f) }} aria-hidden="true" />
                    {t(`planning.famille.${f}` as MessageKey)}
                  </li>
                ))}
                <li>
                  <span className="swatch swatch-free" aria-hidden="true" />
                  {t('planning.free')}
                </li>
              </ul>
            </div>
            <PosterGrid
              slots={slots}
              club={club}
              espace={shownEspace || undefined}
              weekDates={weekDates}
              exceptions={exceptions}
              closedJours={closedJours}
              todayJour={todayJour}
              nowMin={nowMin}
              focusCoach={coach}
              canEdit={canEditClub}
              onOpen={(s) => setOpenSlot(s.id)}
              onMove={canEditClub ? (s) => openMove(s) : undefined}
              onCancel={canEditClub ? (s) => openCancel(s) : undefined}
              onAdd={canEditClub ? (at) => setWizard({ kind: 'ajout', start: { club, espace: shownEspace, jour: at.jour, debut: `${String(Math.floor(at.debut / 60)).padStart(2, '0')}:${String(at.debut % 60).padStart(2, '0')}`, fin: `${String(Math.floor(at.fin / 60)).padStart(2, '0')}:${String(at.fin % 60).padStart(2, '0')}` } }) : undefined}
            />
            {!canEditClub && canEdit ? <p className="field-help">{t('planning.outOfScope')}</p> : null}
          </section>
        ) : null}

        {view === 'liste' ? (
          <section className="panel" aria-label={t('planning.view.liste')}>
            <div className="panel-body" style={{ paddingTop: 12 }}>
              <DataTable<Slot> rows={listRows} columns={columns} rowKey={(s) => s.id} rowName={(s) => `${s.activite} ${heure(s.debut)}`} caption={t('planning.list.caption', { club: CLUB_LABEL[club] })} initialSort={{ id: 'jour', dir: 'asc' }} onOpen={(s) => setOpenSlot(s.id)} activeKey={openSlot} />
            </div>
          </section>
        ) : null}

        {view === 'horaires' ? (
          <HoursView
            club={club}
            slots={slots}
            horaires={horaires}
            source={horairesSource}
            closures={closures}
            exceptions={exceptions}
            today={today}
            canEdit={canEditClub}
            editable={editable}
            onOpen={(s) => setOpenSlot(s.id)}
            onCloseDay={canEdit ? () => setWizard({ kind: 'fermeture' }) : undefined}
          />
        ) : null}

        {view === 'reseau' ? <NetworkDay slots={slots} jour={netDay} date={weekDates[netDay]} exceptions={exceptions} nowMin={todayJour === netDay ? nowMin : null} focusCoach={coach} onOpen={(s) => setOpenSlot(s.id)} onPickDay={setNetDay} /> : null}

        {view === 'controles' ? (
          <ControlsView
            slots={slots}
            horaires={horaires}
            onOpen={(s) => setOpenSlot(s.id)}
            onMove={canEdit ? (s) => openMove(s) : undefined}
            onFocusCoach={(c, home) => {
              setCoach(c);
              setClub(home);
              setView('affiche');
            }}
          />
        ) : null}

        {view === 'adherent' ? <MemberPreview slots={slots} club={club} espace={shownEspace || undefined} jour={todayJour ?? netDay} date={weekDates[todayJour ?? netDay]} exceptions={exceptions} closedJours={closedJours} closedMotif={closureOn(closures, club, weekDates[todayJour ?? netDay])?.motif ?? null} dayHours={hoursOf(horaires, club)[todayJour ?? netDay] ?? null} nowMin={nowMin} todayJour={todayJour} weekDates={weekDates} /> : null}

        <HistoryPanel history={history} slots={slots} canEdit={canEdit} />
      </div>

      <SlotDrawer slot={slot} exceptions={exceptions} history={history} today={today} canEdit={Boolean(slot && canEdit && editable.includes(slot.club))} onClose={() => setOpenSlot(null)} onMove={openMove} onCancel={openCancel} onRemove={openRemove} onRestore={restore} />

      {canEdit ? (
        <>
          <AddWizard open={wizard?.kind === 'ajout'} start={wizard?.kind === 'ajout' ? wizard.start : undefined} slots={slots} exceptions={exceptions} editable={editable} today={today} onClose={closeWizard} />
          <MoveWizard open={wizard?.kind === 'deplacement'} slot={wizard?.kind === 'deplacement' ? wizard.slot : null} slots={slots} exceptions={exceptions} editable={editable} today={today} onClose={closeWizard} />
          <CancelWizard open={wizard?.kind === 'annulation'} slot={wizard?.kind === 'annulation' ? wizard.slot : null} date={wizard?.kind === 'annulation' ? wizard.date : undefined} scope={wizard?.kind === 'annulation' ? wizard.scope : undefined} slots={slots} exceptions={exceptions} editable={editable} today={today} onClose={closeWizard} />
          <ClosureWizard open={wizard?.kind === 'fermeture'} slots={slots} exceptions={exceptions} horaires={horaires} closures={closures} editable={editable} today={today} onClose={closeWizard} />
        </>
      ) : null}
    </>
  );
}
