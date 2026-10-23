'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState, type ReactNode } from 'react';

import { addCourse, cancelCourse, closeClubsDay, moveCourse, removeCourse, undoPlanning } from './actions';
import { PosterGrid } from './PosterGrid';
import { IconAlert, IconBan, IconCalendarOff, IconCalendarPlus, IconCheck, IconMove, IconSearch } from '@/components/icons';
import { Choices, Chips, Field, Review, Switch, TextInput } from '@/components/wizard/fields';
import { Wizard, type Errors, type SubmitResult, type WizardStep } from '@/components/wizard/Wizard';
import { useI18n } from '@/i18n/client';
import type { MessageKey } from '@/i18n/messages';
import type { ActionResult } from '@/lib/action-result';
import { CLUB_IDS, CLUB_LABEL, CLUB_PHOTO, photoThumb } from '@/lib/clubs';
import { fmtDate } from '@/lib/format';
import { addDaysYmd, conflictsFor, duree, espacesFor, familleColor, heure, hhmmOf, isFree, minutesOf, mondayOf, nextDates, normaliseActivite, type Conflicts, type SlotDraft } from '@/lib/planning/model';
import { nextFeries, type FerieKey } from '@/lib/planning/feries';
import { FAMILLES, type ClubId, type Famille, type Slot, type SlotException } from '@/lib/types';

export type WizardKind = 'ajout' | 'deplacement' | 'annulation';

type Common = {
  slots: Slot[];
  exceptions: SlotException[];
  editable: ClubId[];
  today: string;
  onClose: () => void;
};

const MOTIFS = ['coach-absent', 'salle', 'ferie', 'evenement', 'vacances', 'autre'] as const;
type Motif = (typeof MOTIFS)[number];
const DURATIONS = [45, 60, 75, 90, 120];

/* ------------------------------------------------------------------ */
/* Outils partagés                                                      */
/* ------------------------------------------------------------------ */

function useErr() {
  const { t } = useI18n();
  return (key: string) => t(key as MessageKey);
}

/** Les erreurs de champ du serveur (clés) traduites, et l'étape qui porte le champ. */
function serverFailure(res: Extract<ActionResult<unknown>, { ok: false }>, t: (k: MessageKey) => string, stepOf: Record<string, string>): SubmitResult {
  const fieldErrors: Errors = {};
  for (const [k, v] of Object.entries(res.fieldErrors ?? {})) fieldErrors[k] = t(v as MessageKey);
  const first = Object.keys(fieldErrors)[0];
  return { ok: false, error: t(`err.${res.error}` as MessageKey), fieldErrors, step: first ? stepOf[first] : undefined };
}

function timeErrors(jour: number | null, debut: string, fin: string, activite: string, err: (k: string) => string): Errors {
  const e: Errors = {};
  if (jour === null) e.jour = err('planning.err.jour');
  const d = minutesOf(debut);
  const f = minutesOf(fin);
  if (d === null || d < 360 || d > 1410 || d % 5) e.debut = err('planning.err.debut');
  if (f === null || f < 375 || f > 1440 || f % 5) e.fin = err('planning.err.fin');
  if (!e.debut && !e.fin) {
    const span = f! - d!;
    if (span < 20) e.fin = err('planning.err.court');
    else if (span > (isFree({ activite }) ? 720 : 240)) e.fin = err('planning.err.long');
  }
  return e;
}

function ConflictPanel({ conflicts, confirm, onConfirm, error }: { conflicts: Conflicts; confirm: boolean; onConfirm: (v: boolean) => void; error?: string }) {
  const { t } = useI18n();
  const none = !conflicts.room.length && !conflicts.coach.length && !conflicts.travel.length;
  const line = (s: Slot) => `${CLUB_LABEL[s.club]}${s.espace ? ` (${s.espace})` : ''} · ${t(`day.${s.jour}` as MessageKey)} ${heure(s.debut)}–${heure(s.fin)} · ${s.activite}${s.coach && s.coach !== 'ACCES LIBRE' ? ` · ${s.coach}` : ''}`;
  if (none) {
    return (
      <div className="callout" data-kind="pos" role="status">
        <IconCheck />
        <span>
          <span className="callout-title">{t('planning.check.none')}. </span>
          {t('planning.check.none.sub')}
        </span>
      </div>
    );
  }
  return (
    <div className="stack" style={{ '--gap': '12px' } as React.CSSProperties}>
      {conflicts.coach.length ? (
        <div className="callout" data-kind="neg" role="alert">
          <IconAlert />
          <span>
            <span className="callout-title">{t('planning.check.coach')}. </span>
            {t('planning.check.coach.sub')}
            <ul className="conflict-list">
              {conflicts.coach.map((s) => (
                <li key={s.id}>{line(s)}</li>
              ))}
            </ul>
            <label className="confirm-line">
              <Switch id="confirmCoach" checked={confirm} onChange={onConfirm} label={t('planning.check.coach.confirm')} />
              <span>{t('planning.check.coach.confirm')}</span>
            </label>
            {error ? <span className="field-error">{error}</span> : null}
          </span>
        </div>
      ) : null}
      {conflicts.room.length ? (
        <div className="callout" data-kind="warn">
          <IconAlert />
          <span>
            <span className="callout-title">{t('planning.check.room')}. </span>
            {t('planning.check.room.sub')}
            <ul className="conflict-list">
              {conflicts.room.map((s) => (
                <li key={s.id}>{line(s)}</li>
              ))}
            </ul>
          </span>
        </div>
      ) : null}
      {conflicts.travel.length ? (
        <div className="callout" data-kind="warn">
          <IconAlert />
          <span>
            <span className="callout-title">{t('planning.check.travel')}. </span>
            {t('planning.check.travel.sub')}
            <ul className="conflict-list">
              {conflicts.travel.map((s) => (
                <li key={s.id}>{line(s)}</li>
              ))}
            </ul>
          </span>
        </div>
      ) : null}
    </div>
  );
}

function TimeFields({ jour, debut, fin, onChange, errors, withDay = true }: { jour: number | null; debut: string; fin: string; onChange: (p: { jour?: number; debut?: string; fin?: string }) => void; errors: Errors; withDay?: boolean }) {
  const { t } = useI18n();
  const d = minutesOf(debut);
  const f = minutesOf(fin);
  return (
    <div className="stack" style={{ '--gap': '18px' } as React.CSSProperties}>
      {withDay ? (
        <Field id="jour" label={t('planning.f.day')} error={errors.jour}>
          <Chips<string> id="jour" single values={jour === null ? [] : [String(jour)]} onChange={(v) => onChange({ jour: Number(v[0]) })} options={[0, 1, 2, 3, 4, 5, 6].map((j) => ({ value: String(j), label: t(`day.${j}` as MessageKey) }))} />
        </Field>
      ) : null}
      <div className="grid grid-2" style={{ '--gap': '14px' } as React.CSSProperties}>
        <Field id="debut" label={t('planning.f.start')} error={errors.debut}>
          <TextInput id="debut" type="time" step={300} min="06:00" max="23:30" value={debut} error={errors.debut} onChange={(e) => onChange({ debut: e.target.value })} />
        </Field>
        <Field id="fin" label={t('planning.f.end')} error={errors.fin} hint={d !== null && f !== null && f > d ? t('planning.f.duration', { d: duree(f - d) }) : undefined}>
          <TextInput id="fin" type="time" step={300} min="06:15" max="23:59" value={fin} error={errors.fin} hint onChange={(e) => onChange({ fin: e.target.value })} />
        </Field>
      </div>
      <div className="row" style={{ '--gap': '6px' } as React.CSSProperties} role="group" aria-label={t('planning.f.quick')}>
        <span className="muted small">{t('planning.f.quick')}</span>
        {DURATIONS.map((m) => (
          <button key={m} type="button" className="chip" aria-pressed={d !== null && f !== null && f - d === m} disabled={d === null} onClick={() => d !== null && onChange({ fin: hhmmOf(Math.min(1440, d + m)) })}>
            {duree(m)}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Choisir un cours : club, jour, recherche, puis une liste qu'on lit d'un coup d'œil. */
function CoursePicker({ slots, editable, value, onChange, error, exceptions }: { slots: Slot[]; editable: ClubId[]; value: string; onChange: (id: string) => void; error?: string; exceptions: SlotException[] }) {
  const { t } = useI18n();
  const current = slots.find((s) => s.id === value);
  const [club, setClub] = useState<ClubId>(current?.club ?? editable[0] ?? 'minimes');
  const [jour, setJour] = useState<number | null>(current?.jour ?? null);
  const [q, setQ] = useState('');
  const fold = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
  const list = slots
    .filter((s) => s.club === club && !isFree(s) && (jour === null || s.jour === jour) && (!q || fold(`${s.activite} ${s.coach ?? ''} ${s.espace ?? ''}`).includes(fold(q))))
    .sort((a, b) => a.jour - b.jour || a.debut - b.debut);
  return (
    <div className="stack" style={{ '--gap': '14px' } as React.CSSProperties}>
      <Chips<ClubId> id="club" single values={[club]} onChange={(v) => setClub(v[0])} options={editable.map((c) => ({ value: c, label: CLUB_LABEL[c] }))} />
      <div className="row" style={{ '--gap': '10px' } as React.CSSProperties}>
        <Chips<string>
          id="jourFiltre"
          single
          values={[jour === null ? 'all' : String(jour)]}
          onChange={(v) => setJour(v[0] === 'all' ? null : Number(v[0]))}
          options={[{ value: 'all', label: t('planning.allDays') }, ...[0, 1, 2, 3, 4, 5, 6].filter((j) => slots.some((s) => s.club === club && s.jour === j)).map((j) => ({ value: String(j), label: t(`planning.dayShort.${j}` as MessageKey) }))]}
        />
        <div className="input-group picker-search">
          <IconSearch size={16} />
          <input className="input" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('planning.picker.search')} aria-label={t('planning.picker.search')} />
        </div>
      </div>
      <div className="course-list" role="radiogroup" aria-label={t('planning.picker.label')} data-field="slotId" id="f-slotId">
        {list.length === 0 ? <p className="muted">{t('planning.picker.none')}</p> : null}
        {list.map((s) => {
          const a = normaliseActivite(s.activite);
          const cancels = exceptions.filter((e) => e.slotId === s.id).length;
          return (
            <label key={s.id} className="course-item" data-on={s.id === value || undefined}>
              <input type="radio" name="slotId" value={s.id} checked={s.id === value} onChange={() => onChange(s.id)} />
              <span className="course-dot" style={{ background: familleColor(a.famille) }} aria-hidden="true" />
              <span className="course-when">
                {t(`planning.dayShort.${s.jour}` as MessageKey)} {heure(s.debut)}–{heure(s.fin)}
              </span>
              <span className="course-what">
                {s.activite}
                <small>
                  {[s.espace, s.coach && s.coach !== 'ACCES LIBRE' ? s.coach : t('planning.noCoach')].filter(Boolean).join(' · ')}
                  {cancels ? ` · ${t('planning.picker.cancels', { n: cancels })}` : ''}
                </small>
              </span>
            </label>
          );
        })}
      </div>
      {error ? <p className="field-error">{error}</p> : null}
    </div>
  );
}

function PreviewPoster({ slots, club, espace, highlightId, weekDates, exceptions, caption }: { slots: Slot[]; club: ClubId; espace?: string; highlightId?: string; weekDates?: string[]; exceptions?: SlotException[]; caption: ReactNode }) {
  return (
    <figure className="wiz-poster">
      <PosterGrid slots={slots} club={club} espace={espace || undefined} compact highlightId={highlightId} weekDates={weekDates} exceptions={exceptions} />
      <figcaption>{caption}</figcaption>
    </figure>
  );
}

const weekOf = (ymd: string) => {
  const mon = mondayOf(ymd);
  return [0, 1, 2, 3, 4, 5, 6].map((i) => addDaysYmd(mon, i));
};

/* ------------------------------------------------------------------ */
/* Ajouter un cours                                                     */
/* ------------------------------------------------------------------ */

export type AddState = { club: ClubId | ''; espace: string; famille: Famille | ''; activite: string; jour: number | null; debut: string; fin: string; coach: string; confirmCoach: boolean };

export function AddWizard({ open, slots, exceptions, editable, today, onClose, start }: Common & { open: boolean; start?: Partial<AddState> }) {
  const { t } = useI18n();
  const err = useErr();
  const router = useRouter();
  const initial: AddState = { club: editable.length === 1 ? editable[0] : '', espace: '', famille: '', activite: '', jour: null, debut: '18:30', fin: '19:30', coach: '', confirmCoach: false, ...start };

  const draftOf = (s: AddState): SlotDraft | null => {
    const d = minutesOf(s.debut);
    const f = minutesOf(s.fin);
    if (!s.club || s.jour === null || d === null || f === null || f <= d || !s.activite.trim()) return null;
    const draft: SlotDraft = { club: s.club, jour: s.jour, debut: d, fin: f, activite: s.activite.trim().toUpperCase(), id: '__nouveau' };
    if (s.espace) draft.espace = s.espace;
    if (s.coach.trim()) draft.coach = s.coach.trim().toUpperCase();
    return draft;
  };

  const coachesFor = (club: ClubId | '') => {
    const count = new Map<string, number>();
    for (const s of slots) if (s.coach && s.coach !== 'ACCES LIBRE') count.set(s.coach, (count.get(s.coach) ?? 0) + (s.club === club ? 10 : 1));
    return [...count.entries()].sort((a, b) => b[1] - a[1]).map(([c]) => c);
  };

  const activitiesFor = (f: Famille | '') => {
    const count = new Map<string, number>();
    for (const s of slots) if (f && normaliseActivite(s.activite).famille === f) count.set(s.activite, (count.get(s.activite) ?? 0) + 1);
    return [...count.entries()].sort((a, b) => b[1] - a[1]).map(([a]) => a).slice(0, 10);
  };

  const steps: WizardStep<AddState>[] = [
    {
      id: 'club',
      title: t('planning.w.club'),
      hint: t('planning.w.club.hint'),
      validate: (s): Errors => {
        const e: Errors = {};
        if (!s.club) e.club = err('planning.err.club');
        else if (espacesFor(slots, s.club).length && !s.espace) e.espace = err('planning.err.espace');
        return e;
      },
      render: ({ state, set, errors }) => {
        const espaces = state.club ? espacesFor(slots, state.club) : [];
        return (
          <div className="stack" style={{ '--gap': '20px' } as React.CSSProperties}>
            <Field id="club" label={t('planning.f.club')} error={errors.club}>
              <Choices<ClubId>
                name="club"
                value={state.club || null}
                min={180}
                onChange={(v) => set({ club: v, espace: '' })}
                options={CLUB_IDS.filter((c) => editable.includes(c)).map((c) => ({
                  value: c,
                  title: CLUB_LABEL[c],
                  sub: t('planning.clubCount', { n: slots.filter((s) => s.club === c && !isFree(s)).length }),
                  // eslint-disable-next-line @next/next/no-img-element -- photothèque locale, vignette réduite par Next
                  icon: <img className="choice-photo" src={photoThumb(CLUB_PHOTO[c], 96)} alt="" width={44} height={44} />,
                }))}
              />
            </Field>
            {espaces.length ? (
              <Field id="espace" label={t('planning.f.espace')} hint={t('planning.f.espace.help')} error={errors.espace}>
                <Chips<string> id="espace" single values={state.espace ? [state.espace] : []} onChange={(v) => set({ espace: v[0] })} options={espaces.map((e) => ({ value: e, label: e }))} />
              </Field>
            ) : null}
          </div>
        );
      },
    },
    {
      id: 'activite',
      title: t('planning.w.activite'),
      hint: t('planning.w.activite.hint'),
      validate: (s): Errors => {
        const a = s.activite.trim();
        if (!a) return { activite: err('planning.err.activite') };
        if (a.length > 60) return { activite: err('planning.err.activiteLong') };
        return {};
      },
      render: ({ state, set, errors }) => {
        const a = state.activite.trim() ? normaliseActivite(state.activite) : null;
        return (
          <div className="stack" style={{ '--gap': '20px' } as React.CSSProperties}>
            <Field id="famille" label={t('planning.f.famille')}>
              <Chips<Famille> id="famille" single values={state.famille ? [state.famille] : []} onChange={(v) => set({ famille: v[0] })} options={FAMILLES.map((f) => ({ value: f, label: t(`planning.famille.${f}` as MessageKey), swatch: familleColor(f) }))} />
            </Field>
            {state.famille ? (
              <div className="row" style={{ '--gap': '6px' } as React.CSSProperties} role="group" aria-label={t('planning.f.suggestions')}>
                {activitiesFor(state.famille).map((x) => (
                  <button key={x} type="button" className="chip chip-mono" aria-pressed={state.activite.trim().toUpperCase() === x} onClick={() => set({ activite: x })}>
                    {x}
                  </button>
                ))}
              </div>
            ) : null}
            <Field id="activite" label={t('planning.f.activite')} hint={t('planning.f.activite.help')} error={errors.activite} counter={{ n: state.activite.length, max: 60 }}>
              <TextInput id="activite" value={state.activite} error={errors.activite} hint maxLength={80} autoComplete="off" onChange={(e) => set({ activite: e.target.value.toUpperCase() })} placeholder="BOXE ANGLAISE (LOISIRS)" />
            </Field>
            {a ? (
              <p className="read-as">
                <span className="read-as-dot" style={{ background: familleColor(a.famille) }} aria-hidden="true" />
                {t('planning.readAs')} <b>{a.libelle}</b>
                {a.public || a.niveau ? ` · ${[a.public, a.niveau].filter(Boolean).join(' · ')}` : ''}
              </p>
            ) : null}
          </div>
        );
      },
    },
    {
      id: 'horaire',
      title: t('planning.w.horaire'),
      hint: t('planning.w.horaire.hint'),
      validate: (s): Errors => timeErrors(s.jour, s.debut, s.fin, s.activite, err),
      render: ({ state, set, errors }) => <TimeFields jour={state.jour} debut={state.debut} fin={state.fin} errors={errors} onChange={(p) => set(p)} />,
    },
    {
      id: 'coach',
      title: t('planning.w.coach'),
      hint: t('planning.w.coach.hint'),
      validate: (s): Errors => (s.coach.trim().length > 40 ? { coach: err('planning.err.coachLong') } : {}),
      render: ({ state, set, errors }) =>
        isFree({ activite: state.activite }) ? (
          <div className="callout">
            <IconCheck />
            <span>{t('planning.coach.free')}</span>
          </div>
        ) : (
          <div className="stack" style={{ '--gap': '14px' } as React.CSSProperties}>
            <Field id="coach" label={t('planning.f.coach')} optional hint={t('planning.f.coach.help')} error={errors.coach}>
              <TextInput id="coach" list="coach-list" value={state.coach} error={errors.coach} hint maxLength={40} autoComplete="off" onChange={(e) => set({ coach: e.target.value.toUpperCase(), confirmCoach: false })} />
            </Field>
            <datalist id="coach-list">
              {coachesFor(state.club).map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
            <div className="row" style={{ '--gap': '6px' } as React.CSSProperties}>
              {coachesFor(state.club)
                .slice(0, 8)
                .map((c) => (
                  <button key={c} type="button" className="chip" aria-pressed={state.coach.trim().toUpperCase() === c} onClick={() => set({ coach: c, confirmCoach: false })}>
                    {c}
                  </button>
                ))}
            </div>
          </div>
        ),
    },
    {
      id: 'controle',
      title: t('planning.w.controle'),
      hint: t('planning.w.controle.hint'),
      validate: (s): Errors => {
        const d = draftOf(s);
        if (!d) return {};
        return conflictsFor(slots, d).coach.length && !s.confirmCoach ? { confirmCoach: err('planning.err.coachBusy') } : {};
      },
      render: ({ state, set, errors }) => {
        const d = draftOf(state);
        return d ? <ConflictPanel conflicts={conflictsFor(slots, d)} confirm={state.confirmCoach} onConfirm={(v) => set({ confirmCoach: v })} error={errors.confirmCoach} /> : null;
      },
    },
    {
      id: 'relire',
      title: t('planning.w.relire'),
      hint: t('planning.w.relire.hint'),
      render: ({ state, goTo }) => {
        const d = minutesOf(state.debut);
        const f = minutesOf(state.fin);
        return (
          <div className="stack" style={{ '--gap': '16px' } as React.CSSProperties}>
            <Review
              goTo={goTo}
              rows={[
                { label: t('planning.f.club'), value: state.club ? `${CLUB_LABEL[state.club]}${state.espace ? ` · ${state.espace}` : ''}` : '—', step: 'club' },
                { label: t('planning.f.activite'), value: state.activite || '—', step: 'activite' },
                { label: t('planning.f.when'), value: state.jour !== null && d !== null && f !== null ? `${t(`day.${state.jour}` as MessageKey)} · ${heure(d)}–${heure(f)} (${duree(f - d)})` : '—', step: 'horaire' },
                { label: t('planning.f.coach'), value: state.coach || t('planning.noCoach'), step: 'coach' },
              ]}
            />
            <p className="field-help">{t('planning.w.relire.app')}</p>
          </div>
        );
      },
    },
  ];

  const preview = (s: AddState) => {
    if (!s.club) return <p className="muted">{t('planning.preview.pickClub')}</p>;
    const d = draftOf(s);
    const shown = d ? [...slots, { ...d, id: '__nouveau' } as Slot] : slots;
    return <PreviewPoster slots={shown} club={s.club} espace={s.espace} highlightId={d ? '__nouveau' : undefined} weekDates={weekOf(today)} exceptions={exceptions} caption={d ? t('planning.preview.added') : t('planning.preview.poster', { club: CLUB_LABEL[s.club] })} />;
  };

  const onSubmit = async (s: AddState): Promise<SubmitResult> => {
    const res = await addCourse({ club: s.club, espace: s.espace, jour: s.jour, debut: minutesOf(s.debut), fin: minutesOf(s.fin), activite: s.activite, coach: s.coach }, s.confirmCoach);
    if (!res.ok) return serverFailure(res, t, { club: 'club', espace: 'club', activite: 'activite', jour: 'horaire', debut: 'horaire', fin: 'horaire', coach: 'controle' });
    return {
      ok: true,
      message: t('planning.done.added'),
      undo: async () => {
        await undoPlanning(res.data.changeId);
        router.refresh();
      },
    };
  };

  return (
    <Wizard<AddState>
      open={open}
      onClose={onClose}
      kicker={t('planning.w.kicker')}
      title={t('planning.w.add.title')}
      icon={<IconCalendarPlus />}
      steps={steps}
      initial={initial}
      draftKey={start ? undefined : 'planning-ajout'}
      preview={preview}
      previewLabel={t('planning.preview.label')}
      submitLabel={t('planning.w.add.submit')}
      onSubmit={onSubmit}
    />
  );
}

/* ------------------------------------------------------------------ */
/* Déplacer un cours                                                    */
/* ------------------------------------------------------------------ */

type MoveState = { slotId: string; jour: number | null; debut: string; fin: string; espace: string; coach: string; confirmCoach: boolean; notify: boolean };

export function MoveWizard({ open, slots, exceptions, editable, today, onClose, slot }: Common & { open: boolean; slot?: Slot | null }) {
  const { t } = useI18n();
  const err = useErr();
  const router = useRouter();
  const from = (s?: Slot | null): MoveState => ({ slotId: s?.id ?? '', jour: s?.jour ?? null, debut: s ? hhmmOf(s.debut) : '18:30', fin: s ? hhmmOf(s.fin) : '19:30', espace: s?.espace ?? '', coach: s?.coach && s.coach !== 'ACCES LIBRE' ? s.coach : '', confirmCoach: false, notify: true });
  const initial = from(slot);
  const byId = (id: string) => slots.find((s) => s.id === id);

  const draftOf = (s: MoveState): SlotDraft | null => {
    const before = byId(s.slotId);
    const d = minutesOf(s.debut);
    const f = minutesOf(s.fin);
    if (!before || s.jour === null || d === null || f === null || f <= d) return null;
    const draft: SlotDraft = { club: before.club, jour: s.jour, debut: d, fin: f, activite: before.activite, id: before.id };
    if (s.espace) draft.espace = s.espace;
    if (isFree(before)) draft.coach = before.coach;
    else if (s.coach.trim()) draft.coach = s.coach.trim().toUpperCase();
    return draft;
  };
  const unchanged = (s: MoveState) => {
    const b = byId(s.slotId);
    const d = draftOf(s);
    return Boolean(b && d && b.jour === d.jour && b.debut === d.debut && b.fin === d.fin && (b.espace ?? '') === (d.espace ?? '') && (b.coach ?? '') === (d.coach ?? ''));
  };

  const steps: WizardStep<MoveState>[] = [
    {
      id: 'cours',
      title: t('planning.w.cours'),
      hint: t('planning.w.cours.hint'),
      validate: (s): Errors => (byId(s.slotId) ? {} : { slotId: err('planning.err.pick') }),
      render: ({ state, set, errors }) => <CoursePicker slots={slots} editable={editable} exceptions={exceptions} value={state.slotId} error={errors.slotId} onChange={(id) => set(from(byId(id)))} />,
    },
    {
      id: 'horaire',
      title: t('planning.w.nouvelHoraire'),
      hint: t('planning.w.nouvelHoraire.hint'),
      validate: (s): Errors => {
        const before = byId(s.slotId);
        const e = timeErrors(s.jour, s.debut, s.fin, before?.activite ?? '', err);
        if (!Object.keys(e).length && unchanged(s)) e.debut = err('planning.err.same');
        return e;
      },
      render: ({ state, set, errors }) => {
        const before = byId(state.slotId);
        const espaces = before ? espacesFor(slots, before.club) : [];
        return (
          <div className="stack" style={{ '--gap': '20px' } as React.CSSProperties}>
            {before ? (
              <p className="was">
                {t('planning.was')} <b>{t(`day.${before.jour}` as MessageKey)} {heure(before.debut)}–{heure(before.fin)}</b>
                {before.espace ? ` · ${before.espace}` : ''}
              </p>
            ) : null}
            <TimeFields jour={state.jour} debut={state.debut} fin={state.fin} errors={errors} onChange={(p) => set({ ...p, confirmCoach: false })} />
            {espaces.length ? (
              <Field id="espace" label={t('planning.f.espace')}>
                <Chips<string> id="espace" single values={state.espace ? [state.espace] : []} onChange={(v) => set({ espace: v[0], confirmCoach: false })} options={espaces.map((e) => ({ value: e, label: e }))} />
              </Field>
            ) : null}
            {before && !isFree(before) ? (
              <Field id="coach" label={t('planning.f.coach')} optional hint={t('planning.f.coachChange')}>
                <TextInput id="coach" value={state.coach} hint maxLength={40} autoComplete="off" onChange={(e) => set({ coach: e.target.value.toUpperCase(), confirmCoach: false })} />
              </Field>
            ) : null}
          </div>
        );
      },
    },
    {
      id: 'controle',
      title: t('planning.w.controle'),
      hint: t('planning.w.controle.hint'),
      validate: (s): Errors => {
        const d = draftOf(s);
        if (!d) return {};
        return conflictsFor(slots, d, s.slotId).coach.length && !s.confirmCoach ? { confirmCoach: err('planning.err.coachBusy') } : {};
      },
      render: ({ state, set, errors }) => {
        const d = draftOf(state);
        return d ? <ConflictPanel conflicts={conflictsFor(slots, d, state.slotId)} confirm={state.confirmCoach} onConfirm={(v) => set({ confirmCoach: v })} error={errors.confirmCoach} /> : null;
      },
    },
    {
      id: 'prevenir',
      title: t('planning.w.prevenir'),
      hint: t('planning.w.prevenir.hint'),
      render: ({ state, set }) => (
        <div className="stack" style={{ '--gap': '14px' } as React.CSSProperties}>
          <label className="switch-line">
            <Switch id="notify" checked={state.notify} onChange={(v) => set({ notify: v })} label={t('planning.f.notify')} />
            <span>
              <b>{t('planning.f.notify')}</b>
              <small>{t('planning.f.notify.move')}</small>
            </span>
          </label>
          <p className="field-help">{t('planning.f.notify.app')}</p>
        </div>
      ),
    },
    {
      id: 'relire',
      title: t('planning.w.relire'),
      hint: t('planning.w.relire.hint'),
      render: ({ state, goTo }) => {
        const before = byId(state.slotId);
        const d = draftOf(state);
        return (
          <Review
            goTo={goTo}
            rows={[
              { label: t('planning.f.course'), value: before ? `${before.activite} · ${CLUB_LABEL[before.club]}` : '—', step: 'cours' },
              { label: t('planning.f.before'), value: before ? `${t(`day.${before.jour}` as MessageKey)} ${heure(before.debut)}–${heure(before.fin)}${before.espace ? ` · ${before.espace}` : ''}` : '—', step: 'cours' },
              { label: t('planning.f.after'), value: d ? `${t(`day.${d.jour}` as MessageKey)} ${heure(d.debut)}–${heure(d.fin)}${d.espace ? ` · ${d.espace}` : ''}` : '—', step: 'horaire' },
              { label: t('planning.f.coach'), value: d?.coach && d.coach !== 'ACCES LIBRE' ? d.coach : t('planning.noCoach'), step: 'horaire' },
              { label: t('planning.f.notify'), value: state.notify ? t('planning.yes') : t('planning.no'), step: 'prevenir' },
            ]}
          />
        );
      },
    },
  ];

  const preview = (s: MoveState) => {
    const before = byId(s.slotId);
    if (!before) return <p className="muted">{t('planning.preview.pickCourse')}</p>;
    const d = draftOf(s);
    const shown = d ? slots.map((x) => (x.id === before.id ? ({ ...d, id: before.id } as Slot) : x)) : slots;
    return (
      <PreviewPoster
        slots={shown}
        club={before.club}
        espace={espacesFor(slots, before.club).length ? (d?.espace ?? before.espace) : undefined}
        highlightId={before.id}
        weekDates={weekOf(today)}
        exceptions={exceptions}
        caption={t('planning.preview.moved', { was: `${t(`day.${before.jour}` as MessageKey)} ${heure(before.debut)}–${heure(before.fin)}` })}
      />
    );
  };

  const onSubmit = async (s: MoveState): Promise<SubmitResult> => {
    const res = await moveCourse(s.slotId, { jour: s.jour, debut: minutesOf(s.debut), fin: minutesOf(s.fin), espace: s.espace, coach: s.coach, activite: byId(s.slotId)?.activite }, s.confirmCoach);
    if (!res.ok) return serverFailure(res, t, { jour: 'horaire', debut: 'horaire', fin: 'horaire', espace: 'horaire', coach: 'controle' });
    if (s.notify) router.push(`/notifications?nouveau=1&from=planning:${encodeURIComponent(s.slotId)}`);
    return {
      ok: true,
      message: t('planning.done.moved'),
      undo: async () => {
        await undoPlanning(res.data.changeId);
        router.refresh();
      },
    };
  };

  return (
    <Wizard<MoveState>
      open={open}
      onClose={onClose}
      kicker={t('planning.w.kicker')}
      title={t('planning.w.move.title')}
      icon={<IconMove />}
      steps={steps}
      initial={initial}
      preview={preview}
      previewLabel={t('planning.preview.label')}
      submitLabel={t('planning.w.move.submit')}
      onSubmit={onSubmit}
    />
  );
}

/* ------------------------------------------------------------------ */
/* Annuler une séance, ou retirer un cours                              */
/* ------------------------------------------------------------------ */

type CancelState = { slotId: string; scope: 'date' | 'retrait'; date: string; motif: Motif | ''; note: string; notify: boolean };

export function CancelWizard({ open, slots, exceptions, editable, today, onClose, slot, date, scope }: Common & { open: boolean; slot?: Slot | null; date?: string; scope?: 'date' | 'retrait' }) {
  const { t, locale } = useI18n();
  const err = useErr();
  const router = useRouter();
  const initial: CancelState = { slotId: slot?.id ?? '', scope: scope ?? 'date', date: date ?? '', motif: '', note: '', notify: true };
  const byId = (id: string) => slots.find((s) => s.id === id);
  const taken = (id: string, d: string) => exceptions.some((e) => e.slotId === id && e.date === d);

  const steps: WizardStep<CancelState>[] = [
    {
      id: 'cours',
      title: t('planning.w.cours'),
      hint: t('planning.w.cours.cancelHint'),
      validate: (s): Errors => (byId(s.slotId) ? {} : { slotId: err('planning.err.pick') }),
      render: ({ state, set, errors }) => <CoursePicker slots={slots} editable={editable} exceptions={exceptions} value={state.slotId} error={errors.slotId} onChange={(id) => set({ slotId: id, date: '' })} />,
    },
    {
      id: 'portee',
      title: t('planning.w.portee'),
      hint: t('planning.w.portee.hint'),
      validate: (s): Errors => (s.scope === 'date' && !s.date ? { date: err('planning.err.date') } : {}),
      render: ({ state, set, errors }) => {
        const before = byId(state.slotId);
        const dates = before ? nextDates(before.jour, today, 8) : [];
        return (
          <div className="stack" style={{ '--gap': '20px' } as React.CSSProperties}>
            <Choices<'date' | 'retrait'>
              name="scope"
              value={state.scope}
              min={240}
              onChange={(v) => set({ scope: v })}
              options={[
                { value: 'date', title: t('planning.scope.date'), sub: t('planning.scope.date.sub'), icon: <IconBan size={20} /> },
                { value: 'retrait', title: t('planning.scope.retrait'), sub: t('planning.scope.retrait.sub'), icon: <IconAlert size={20} /> },
              ]}
            />
            {state.scope === 'date' ? (
              <Field id="date" label={t('planning.f.date')} error={errors.date} hint={t('planning.f.date.help')}>
                <div className="chips" role="group" data-field="date">
                  {dates.map((d, i) => {
                    const off = before ? taken(before.id, d) : false;
                    return (
                      <button key={d} id={i === 0 ? 'f-date' : undefined} type="button" className="chip" aria-pressed={state.date === d} disabled={off} onClick={() => set({ date: d })}>
                        {fmtDate(locale, d, { weekday: 'short', day: 'numeric', month: 'short' })}
                        {off ? ` · ${t('planning.cancelled')}` : ''}
                      </button>
                    );
                  })}
                </div>
              </Field>
            ) : (
              <div className="callout" data-kind="warn">
                <IconAlert />
                <span>{t('planning.scope.retrait.warn')}</span>
              </div>
            )}
          </div>
        );
      },
    },
    {
      id: 'motif',
      title: t('planning.w.motif'),
      hint: t('planning.w.motif.hint'),
      validate: (s): Errors => {
        const e: Errors = {};
        if (s.scope === 'date' && !s.motif) e.motif = err('planning.err.motif');
        if (s.motif === 'autre' && !s.note.trim()) e.note = err('planning.err.note');
        if (s.note.length > 160) e.note = err('planning.err.noteLong');
        return e;
      },
      render: ({ state, set, errors }) => (
        <div className="stack" style={{ '--gap': '18px' } as React.CSSProperties}>
          {state.scope === 'date' ? (
            <Field id="motif" label={t('planning.f.motif')} error={errors.motif}>
              <Choices<Motif> name="motif" value={state.motif || null} min={200} onChange={(v) => set({ motif: v })} options={MOTIFS.map((m) => ({ value: m, title: t(`planning.motif.${m}` as MessageKey), sub: t(`planning.motif.${m}.sub` as MessageKey) }))} />
            </Field>
          ) : null}
          <Field id="note" label={state.scope === 'date' ? t('planning.f.note') : t('planning.f.noteRetrait')} optional={state.motif !== 'autre'} error={errors.note} counter={{ n: state.note.length, max: 160 }}>
            <TextInput id="note" value={state.note} error={errors.note} maxLength={200} onChange={(e) => set({ note: e.target.value })} />
          </Field>
        </div>
      ),
    },
    {
      id: 'prevenir',
      title: t('planning.w.prevenir'),
      hint: t('planning.w.prevenir.hint'),
      render: ({ state, set }) => (
        <label className="switch-line">
          <Switch id="notify" checked={state.notify} onChange={(v) => set({ notify: v })} label={t('planning.f.notify')} />
          <span>
            <b>{t('planning.f.notify')}</b>
            <small>{state.scope === 'date' ? t('planning.f.notify.cancel') : t('planning.f.notify.remove')}</small>
          </span>
        </label>
      ),
    },
    {
      id: 'relire',
      title: t('planning.w.relire'),
      hint: t('planning.w.relire.hint'),
      render: ({ state, goTo }) => {
        const before = byId(state.slotId);
        return (
          <Review
            goTo={goTo}
            rows={[
              { label: t('planning.f.course'), value: before ? `${before.activite} · ${CLUB_LABEL[before.club]} · ${t(`day.${before.jour}` as MessageKey)} ${heure(before.debut)}` : '—', step: 'cours' },
              { label: t('planning.f.scope'), value: state.scope === 'date' ? `${t('planning.scope.date')} · ${state.date ? fmtDate(locale, state.date, { weekday: 'long', day: 'numeric', month: 'long' }) : '—'}` : t('planning.scope.retrait'), step: 'portee' },
              ...(state.scope === 'date' ? [{ label: t('planning.f.motif'), value: state.motif ? t(`planning.motif.${state.motif}` as MessageKey) : '—', step: 'motif' }] : []),
              { label: t('planning.f.note'), value: state.note || '—', step: 'motif' },
              { label: t('planning.f.notify'), value: state.notify ? t('planning.yes') : t('planning.no'), step: 'prevenir' },
            ]}
          />
        );
      },
    },
  ];

  const preview = (s: CancelState) => {
    const before = byId(s.slotId);
    if (!before) return <p className="muted">{t('planning.preview.pickCourse')}</p>;
    const espace = espacesFor(slots, before.club).length ? before.espace : undefined;
    if (s.scope === 'retrait') {
      return <PreviewPoster slots={slots.filter((x) => x.id !== before.id)} club={before.club} espace={espace} caption={t('planning.preview.removed')} />;
    }
    const week = s.date ? weekOf(s.date) : weekOf(today);
    const extra: SlotException[] = s.date ? [...exceptions, { id: '__exc', slotId: before.id, date: s.date, motif: s.motif || 'autre', createdAt: '', createdBy: '' }] : exceptions;
    return <PreviewPoster slots={slots} club={before.club} espace={espace} highlightId={before.id} weekDates={week} exceptions={extra} caption={s.date ? t('planning.preview.cancelled', { date: fmtDate(locale, s.date, { weekday: 'long', day: 'numeric', month: 'long' }) }) : t('planning.preview.pickDate')} />;
  };

  const onSubmit = async (s: CancelState): Promise<SubmitResult> => {
    const res = s.scope === 'date' ? await cancelCourse(s.slotId, s.date, s.motif, s.note) : await removeCourse(s.slotId, s.note);
    if (!res.ok) return serverFailure(res, t, { date: 'portee', motif: 'motif', note: 'motif' });
    if (s.notify) router.push(`/notifications?nouveau=1&from=planning:${encodeURIComponent(s.slotId)}${s.scope === 'date' ? `:${s.date}` : ''}`);
    return {
      ok: true,
      message: s.scope === 'date' ? t('planning.done.cancelled') : t('planning.done.removed'),
      undo: async () => {
        await undoPlanning(res.data.changeId);
        router.refresh();
      },
    };
  };

  return (
    <Wizard<CancelState>
      open={open}
      onClose={onClose}
      kicker={t('planning.w.kicker')}
      title={scope === 'retrait' ? t('planning.w.remove.title') : t('planning.w.cancel.title')}
      icon={<IconBan />}
      steps={steps}
      initial={initial}
      preview={preview}
      previewLabel={t('planning.preview.label')}
      submitLabel={(s) => (s.scope === 'retrait' ? t('planning.w.remove.submit') : t('planning.w.cancel.submit'))}
      submitKind="bell"
      onSubmit={onSubmit}
    />
  );
}

/* ------------------------------------------------------------------ */
/* Fermer un jour (férié, gala, travaux)                                */
/* ------------------------------------------------------------------ */

type ClosureState = { date: string; ferie: FerieKey | ''; clubs: ClubId[]; motif: Motif | ''; note: string };

export function ClosureWizard({ open, slots, exceptions, editable, today, onClose }: Common & { open: boolean }) {
  const { t, locale } = useI18n();
  const err = useErr();
  const router = useRouter();
  const initial: ClosureState = { date: '', ferie: '', clubs: editable.length === 1 ? editable : [], motif: '', note: '' };
  const holidays = useMemo(() => nextFeries(today, 6), [today]);
  const jourOfYmd = (d: string) => {
    const [y, m, dd] = d.split('-').map(Number);
    return (new Date(y, m - 1, dd, 12).getDay() + 6) % 7;
  };
  const sessionsOn = (d: string, clubs: ClubId[]) => {
    if (!d) return [];
    const j = jourOfYmd(d);
    return slots.filter((s) => clubs.includes(s.club) && s.jour === j && !isFree(s) && !exceptions.some((e) => e.slotId === s.id && e.date === d)).sort((a, b) => a.club.localeCompare(b.club) || a.debut - b.debut);
  };
  const longDate = (d: string) => fmtDate(locale, d, { weekday: 'long', day: 'numeric', month: 'long' });

  const steps: WizardStep<ClosureState>[] = [
    {
      id: 'date',
      title: t('planning.w.closeDate'),
      hint: t('planning.w.closeDate.hint'),
      validate: (s): Errors => (!s.date ? { date: err('planning.err.date') } : s.date < today ? { date: err('planning.err.datePassee') } : {}),
      render: ({ state, set, errors }) => (
        <div className="stack" style={{ '--gap': '20px' } as React.CSSProperties}>
          <Field id="ferie" label={t('planning.f.feries')} hint={t('planning.f.feries.help')}>
            <div className="ferie-grid" role="group" data-field="ferie">
              {holidays.map((h, i) => {
                const n = sessionsOn(h.date, editable).length;
                return (
                  <button key={h.date} id={i === 0 ? 'f-ferie' : undefined} type="button" className="ferie" aria-pressed={state.date === h.date} onClick={() => set({ date: h.date, ferie: h.key, motif: state.motif || 'ferie' })}>
                    <span className="ferie-name">{t(`planning.ferie.${h.key}` as MessageKey)}</span>
                    <span className="ferie-date">{fmtDate(locale, h.date, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    <span className="ferie-count">{n ? t('planning.sessionsCount', { n }) : t('planning.noSession')}</span>
                  </button>
                );
              })}
            </div>
          </Field>
          <Field id="date" label={t('planning.f.otherDate')} error={errors.date}>
            <TextInput id="date" type="date" min={today} value={state.date} error={errors.date} onChange={(e) => set({ date: e.target.value, ferie: holidays.find((h) => h.date === e.target.value)?.key ?? '' })} />
          </Field>
        </div>
      ),
    },
    {
      id: 'clubs',
      title: t('planning.w.closeClubs'),
      hint: t('planning.w.closeClubs.hint'),
      validate: (s): Errors => (!s.clubs.length ? { clubs: err('planning.err.clubs') } : !sessionsOn(s.date, s.clubs).length ? { clubs: err('planning.err.noSession') } : {}),
      render: ({ state, set, errors }) => (
        <div className="stack" style={{ '--gap': '14px' } as React.CSSProperties}>
          <Field id="clubs" label={t('planning.f.clubs')} error={errors.clubs}>
            <Chips<ClubId> id="clubs" values={state.clubs} onChange={(v) => set({ clubs: v })} options={editable.map((c) => ({ value: c, label: `${CLUB_LABEL[c]} · ${sessionsOn(state.date, [c]).length}` }))} />
          </Field>
          {editable.length > 1 ? (
            <button type="button" className="btn btn-ghost btn-sm" style={{ justifySelf: 'start' }} onClick={() => set({ clubs: state.clubs.length === editable.length ? [] : [...editable] })}>
              {state.clubs.length === editable.length ? t('planning.clubs.none') : t('planning.clubs.all')}
            </button>
          ) : null}
        </div>
      ),
    },
    {
      id: 'motif',
      title: t('planning.w.motif'),
      hint: t('planning.w.motif.hint'),
      validate: (s): Errors => {
        const e: Errors = {};
        if (!s.motif) e.motif = err('planning.err.motif');
        if (s.motif === 'autre' && !s.note.trim()) e.note = err('planning.err.note');
        if (s.note.length > 160) e.note = err('planning.err.noteLong');
        return e;
      },
      render: ({ state, set, errors }) => (
        <div className="stack" style={{ '--gap': '18px' } as React.CSSProperties}>
          <Field id="motif" label={t('planning.f.motif')} error={errors.motif}>
            <Choices<Motif> name="motif" value={state.motif || null} min={200} onChange={(v) => set({ motif: v })} options={MOTIFS.map((m) => ({ value: m, title: t(`planning.motif.${m}` as MessageKey), sub: t(`planning.motif.${m}.sub` as MessageKey) }))} />
          </Field>
          <Field id="note" label={t('planning.f.note')} optional={state.motif !== 'autre'} error={errors.note} counter={{ n: state.note.length, max: 160 }}>
            <TextInput id="note" value={state.note} error={errors.note} maxLength={200} placeholder={state.ferie ? t(`planning.ferie.${state.ferie}` as MessageKey) : ''} onChange={(e) => set({ note: e.target.value })} />
          </Field>
        </div>
      ),
    },
    {
      id: 'relire',
      title: t('planning.w.relire'),
      hint: t('planning.w.relire.hint'),
      render: ({ state, goTo }) => (
        <Review
          goTo={goTo}
          rows={[
            { label: t('planning.f.date'), value: state.date ? `${longDate(state.date)}${state.ferie ? ` · ${t(`planning.ferie.${state.ferie}` as MessageKey)}` : ''}` : '—', step: 'date' },
            { label: t('planning.f.clubs'), value: state.clubs.map((c) => CLUB_LABEL[c]).join(', ') || '—', step: 'clubs' },
            { label: t('planning.f.sessions'), value: t('planning.sessionsCount', { n: sessionsOn(state.date, state.clubs).length }), step: 'clubs' },
            { label: t('planning.f.motif'), value: state.motif ? `${t(`planning.motif.${state.motif}` as MessageKey)}${state.note ? ` · ${state.note}` : ''}` : '—', step: 'motif' },
          ]}
        />
      ),
    },
  ];

  const preview = (s: ClosureState) => {
    if (!s.date) return <p className="muted">{t('planning.preview.pickDate')}</p>;
    const list = sessionsOn(s.date, s.clubs.length ? s.clubs : editable);
    const byClub = new Map<ClubId, Slot[]>();
    for (const x of list) byClub.set(x.club, [...(byClub.get(x.club) ?? []), x]);
    return (
      <div className="closure-preview">
        <p className="closure-day">{longDate(s.date)}</p>
        {[...byClub.entries()].map(([club, items]) => (
          <section key={club} className="closure-club" data-off={!s.clubs.includes(club) || undefined}>
            <h4>
              {CLUB_LABEL[club]} <span className="muted">· {t('planning.sessionsCount', { n: items.length })}</span>
            </h4>
            <ul>
              {items.map((x) => (
                <li key={x.id}>
                  <span className="course-dot" style={{ background: familleColor(normaliseActivite(x.activite).famille) }} aria-hidden="true" />
                  <span className="closure-time">{heure(x.debut)}</span>
                  <span className="closure-name">{x.activite}</span>
                </li>
              ))}
            </ul>
          </section>
        ))}
        {!list.length ? <p className="muted">{t('planning.noSession')}</p> : null}
      </div>
    );
  };

  const onSubmit = async (s: ClosureState): Promise<SubmitResult> => {
    const res = await closeClubsDay(s.date, s.clubs, s.motif, s.note);
    if (!res.ok) return serverFailure(res, t, { date: 'date', clubs: 'clubs', motif: 'motif', note: 'motif' });
    return {
      ok: true,
      message: t('planning.done.closed', { n: res.data.count, date: longDate(s.date) }),
      undo: async () => {
        await undoPlanning(res.data.changeId);
        router.refresh();
      },
    };
  };

  return (
    <Wizard<ClosureState>
      open={open}
      onClose={onClose}
      kicker={t('planning.w.kicker')}
      title={t('planning.w.close.title')}
      icon={<IconCalendarOff />}
      steps={steps}
      initial={initial}
      preview={preview}
      previewLabel={t('planning.preview.closure')}
      submitLabel={t('planning.w.close.submit')}
      submitKind="bell"
      onSubmit={onSubmit}
    />
  );
}
