import { audit } from './audit';
import { read, readFeatures, update } from './collections';
import { newId } from './crypto';
import { currentSlots, readPlanning } from './planning';
import { ActionError } from './session';
import { CLUB_IDS, isClubId } from '@/lib/clubs';
import { inScope } from '@/lib/permissions';
import { closureOn, freeRanges, hasFreeAccess, hoursOf } from '@/lib/planning/hours';
import { isFree } from '@/lib/planning/model';
import { blocking, type CheckCode, type ModerationCheck, type QueueItem } from '@/lib/team/moderation';
import { NIVEAUX, RETRAIT_MOTIFS, SPARRING, TRAINING_TYPES, type ClubId, type Closure, type FeatureKey, type FeatureState, type ModerationRules, type Niveau, type PlanningState, type RetraitMotif, type SessionUser, type Slot, type TrainingProposal, type TrainingType } from '@/lib/types';

/**
 * LA MODÉRATION DES ENTRAÎNEMENTS ENTRE MEMBRES (CDC §11).
 *
 * Une proposition arrive de l'app (POST /api/entrainements) ou des exemples.
 * Ses vérifications sont recalculées à chaque lecture, d'après les règles du
 * moment : l'âge minimal, les catégories allumées, l'accès libre du club (ses
 * heures d'ouverture, ou les lignes « Accès libre » du planning ce jour-là) et
 * ses jours de fermeture. Rien n'est stocké d'avance, rien ne vieillit.
 */

/* ------------------------------------------------------------------ */
/* Heure de Toulouse                                                    */
/* ------------------------------------------------------------------ */

export function parisNow(now = new Date()): { ymd: string; minutes: number } {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '00';
  return { ymd: `${get('year')}-${get('month')}-${get('day')}`, minutes: (Number(get('hour')) % 24) * 60 + Number(get('minute')) };
}

/** 0 = lundi … 6 = dimanche, pour une date « AAAA-MM-JJ ». */
export function weekdayOf(ymd: string): number {
  const [y, m, d] = ymd.split('-').map(Number);
  return (new Date(Date.UTC(y!, (m ?? 1) - 1, d ?? 1)).getUTCDay() + 6) % 7;
}

function addDays(ymd: string, n: number): string {
  const [y, m, d] = ymd.split('-').map(Number);
  const x = new Date(Date.UTC(y!, (m ?? 1) - 1, (d ?? 1) + n));
  return x.toISOString().slice(0, 10);
}

const hm = (min: number) => (min % 60 ? `${Math.floor(min / 60)}h${String(min % 60).padStart(2, '0')}` : `${Math.floor(min / 60)}h`);

/* ------------------------------------------------------------------ */
/* Les vérifications                                                    */
/* ------------------------------------------------------------------ */

/**
 * CDC §11 D : « Aucun échange direct de coordonnées ». On cherche un numéro
 * (même espacé ou en +33), une adresse e-mail (même « arobase »), un @pseudo,
 * une adresse web, et les noms des messageries et réseaux.
 */
const CONTACT_PATTERNS: RegExp[] = [
  /(?:\+33|0033|\b0)\s*[1-9](?:[\s.\-]*\d{2}){4}\b/g,
  /\b\d{10}\b/g,
  /[\p{L}0-9._%+-]+\s*(?:@|\(at\)|\[at\]|\barobase\b)\s*[\p{L}0-9.-]+\.[a-z]{2,}/giu,
  /(?<![\p{L}0-9])@[a-z0-9_.]{2,30}/giu,
  /\b(?:https?:\/\/|www\.)\S+/gi,
  /\b[a-z0-9-]{2,}\.(?:com|fr|net|org|io|me|gg|ly|app|link)\b/gi,
  /\b(?:whats\s?app|watsap|insta(?:gram)?|snap(?:chat)?|telegram|signal|messenger|facebook|tik\s?tok|discord|twitter|appelle[- ]moi|texto|sms|en priv[ée]e?|mp|dm)\b/giu,
];

/** À relire, sans bloquer : l'argent, l'alcool, la violence hors cadre, les protections écartées, un « numéro » qui annonce peut-être des coordonnées. */
const SENSITIVE = /\b(?:parier|pari|argent|cash|payer|payant|euros?|bi[èe]res?|alcool|drogues?|baston|bagarre|r[èe]glements? de comptes?|sans (?:protections?|casque|gants|prot[èe]ge-dents)|full contact|d[ée]truire|massacrer|t[ée]l[ée]phone|num[ée]ro)\b|€/giu;

function hitsOf(text: string, patterns: RegExp[]): string[] {
  const out = new Set<string>();
  for (const re of patterns) for (const m of text.matchAll(re)) if (m[0].trim()) out.add(m[0].trim());
  return [...out];
}

export type CheckContext = { rules: ModerationRules; features: FeatureState; slots: Slot[]; horaires: PlanningState['horaires']; closures: Closure[]; now: { ymd: string; minutes: number } };

export async function checkContext(): Promise<CheckContext> {
  const [rules, features, planning] = await Promise.all([read('regles'), readFeatures(), readPlanning()]);
  return { rules, features, slots: planning.slots, horaires: planning.horaires, closures: planning.closures ?? [], now: parisNow() };
}

export function checksFor(p: Pick<TrainingProposal, 'type' | 'club' | 'date' | 'debut' | 'observation' | 'organizer'>, ctx: CheckContext): ModerationCheck[] {
  const out: ModerationCheck[] = [];
  const past = p.date < ctx.now.ymd || (p.date === ctx.now.ymd && p.debut < ctx.now.minutes);
  if (past) out.push({ code: 'passee', level: 'bloquant' });

  if (!ctx.features.entrainements.on) out.push({ code: 'categorie-coupee', level: 'bloquant', vars: { what: 'entrainements' } });
  else if (!ctx.features[`entrainements.${p.type}` as FeatureKey].on) out.push({ code: 'categorie-coupee', level: 'bloquant', vars: { what: p.type } });

  const contact = hitsOf(p.observation ?? '', CONTACT_PATTERNS);
  if (contact.length) out.push({ code: 'coordonnees', level: 'bloquant', hits: contact });

  const age = p.organizer.age;
  if (SPARRING.includes(p.type)) {
    if (age === undefined) out.push({ code: 'age-inconnu', level: 'attention', vars: { min: ctx.rules.sparringMinAge } });
    else if (age < ctx.rules.sparringMinAge) out.push({ code: 'sparring-mineur', level: 'bloquant', vars: { age, min: ctx.rules.sparringMinAge } });
  } else if (age !== undefined && age < ctx.rules.otherMinAge) out.push({ code: 'age-minimum', level: 'bloquant', vars: { age, min: ctx.rules.otherMinAge } });

  // CDC §11 A.3 : « un créneau correspondant aux horaires d'accès libre autorisés dans le club concerné ».
  // L'accès libre suit l'ouverture du club, sauf les lignes « Accès libre » du jour (la règle partagée avec l'app).
  // Le footing part du club mais se court dehors : on le signale sans le bloquer.
  const level = p.type === 'footing' ? 'attention' : 'bloquant';
  const closed = closureOn(ctx.closures, p.club, p.date);
  if (closed) out.push({ code: 'club-ferme', level, vars: { motif: closed.motif } });
  else {
    const week = hoursOf(ctx.horaires, p.club);
    const ranges = freeRanges(ctx.slots, week, p.club, weekdayOf(p.date));
    const inside = ranges.some((r) => p.debut >= r.debut && p.debut <= r.fin - 30);
    if (!inside) {
      const vars: Record<string, string | number> = !hasFreeAccess(ctx.slots, week, p.club) ? { none: 1 } : ranges.length ? { day: ranges.map((r) => `${hm(r.debut)}–${hm(r.fin)}`).join(', ') } : { closedDay: 1 };
      out.push({ code: 'hors-acces-libre', level, vars });
    }
  }

  const sensitive = hitsOf(p.observation ?? '', [SENSITIVE]);
  if (sensitive.length) out.push({ code: 'mots-sensibles', level: 'attention', hits: sensitive });
  return out;
}

/** Ce qu'aucune validation ne lève : la sécurité, l'assurance, l'interdit des coordonnées, le passé. */
const HARD: CheckCode[] = ['coordonnees', 'sparring-mineur', 'age-minimum', 'categorie-coupee', 'passee', 'club-ferme'];
export const canForce = (checks: ModerationCheck[]) => !checks.some((c) => c.level === 'bloquant' && HARD.includes(c.code));

/* ------------------------------------------------------------------ */
/* La file                                                              */
/* ------------------------------------------------------------------ */

const ORDER: Record<TrainingProposal['status'], number> = { 'a-verifier': 0, 'en-ligne': 1, retiree: 2 };

export async function readQueue(user: SessionUser): Promise<{ items: QueueItem[]; rules: ModerationRules; features: FeatureState; freeClubs: ClubId[] }> {
  const [list, ctx] = await Promise.all([read('propositions'), checkContext()]);
  const items = list
    .filter((p) => inScope(user, p.club))
    .map((p) => {
      const checks = checksFor(p, ctx);
      return { ...p, checks, blocking: blocking(checks) };
    })
    .sort((a, b) => ORDER[a.status] - ORDER[b.status] || (a.status === 'a-verifier' ? a.createdAt.localeCompare(b.createdAt) : `${a.date}${a.debut}`.localeCompare(`${b.date}${b.debut}`)));
  const freeClubs = CLUB_IDS.filter((c) => hasFreeAccess(ctx.slots, hoursOf(ctx.horaires, c), c));
  return { items, rules: ctx.rules, features: ctx.features, freeClubs };
}

/* ------------------------------------------------------------------ */
/* Décisions                                                            */
/* ------------------------------------------------------------------ */

export type Snapshot = Pick<TrainingProposal, 'id' | 'status' | 'decision'>;

export type Decision = { status: 'en-ligne'; force?: { note: string } } | { status: 'retiree'; motif: RetraitMotif; note?: string };

/**
 * Applique une décision à une ou plusieurs propositions du périmètre. Une mise
 * en ligne refuse ce qui bloque ; la seule levée possible est celle d'un
 * créneau hors accès libre, une proposition à la fois, avec une note.
 */
export async function decide(user: SessionUser, ids: string[], decision: Decision): Promise<{ done: Snapshot[]; skipped: { id: string; codes: CheckCode[] }[] }> {
  if (!ids.length || ids.length > 200) throw new ActionError('invalide');
  if (decision.status === 'retiree' && !RETRAIT_MOTIFS.includes(decision.motif)) throw new ActionError('invalide');
  if (decision.status === 'en-ligne' && decision.force && (ids.length !== 1 || decision.force.note.trim().length < 5)) throw new ActionError('invalide');
  const ctx = await checkContext();
  const at = new Date().toISOString();
  const result = await update('propositions', (list) => {
    const done: Snapshot[] = [];
    const skipped: { id: string; codes: CheckCode[] }[] = [];
    const next = list.map((p) => {
      if (!ids.includes(p.id)) return p;
      if (!inScope(user, p.club)) throw new ActionError('droits');
      if (decision.status === 'en-ligne') {
        const checks = checksFor(p, ctx);
        const stops = checks.filter((c) => c.level === 'bloquant');
        if (stops.length && !(decision.force && canForce(checks))) {
          skipped.push({ id: p.id, codes: stops.map((c) => c.code) });
          return p;
        }
        done.push({ id: p.id, status: p.status, decision: p.decision });
        const note = decision.force ? `${decision.force.note.trim()} (levée : ${stops.map((c) => c.code).join(', ')})` : undefined;
        return { ...p, status: 'en-ligne' as const, decision: { by: user.name, at, ...(note ? { note } : {}) } };
      }
      done.push({ id: p.id, status: p.status, decision: p.decision });
      return { ...p, status: 'retiree' as const, decision: { by: user.name, at, motif: decision.motif, ...(decision.note?.trim() ? { note: decision.note.trim().slice(0, 280) } : {}) } };
    });
    if (ids.some((id) => !list.some((p) => p.id === id))) throw new ActionError('introuvable');
    return { next, result: { done, skipped } };
  });
  if (result.done.length) {
    const detail = decision.status === 'retiree' ? `motif : ${decision.motif}${decision.note ? ` · ${decision.note.slice(0, 120)}` : ''}` : decision.force ? `forcée · ${decision.force.note.slice(0, 120)}` : undefined;
    await audit(user, decision.status === 'en-ligne' ? 'moderation.validation' : 'moderation.retrait', result.done.map((d) => d.id).join(', ').slice(0, 200), detail);
  }
  return result;
}

/** Remet des propositions dans l'état d'avant (le bouton « Annuler l'action » du message). */
export async function restore(user: SessionUser, snapshots: Snapshot[]): Promise<number> {
  if (!snapshots.length || snapshots.length > 200) throw new ActionError('invalide');
  const n = await update('propositions', (list) => {
    let count = 0;
    const next = list.map((p) => {
      const snap = snapshots.find((s) => s.id === p.id);
      if (!snap) return p;
      if (!inScope(user, p.club)) throw new ActionError('droits');
      if (!(['a-verifier', 'en-ligne', 'retiree'] as const).includes(snap.status)) throw new ActionError('invalide');
      count++;
      const back: TrainingProposal = { ...p, status: snap.status };
      if (snap.decision) back.decision = snap.decision;
      else delete back.decision;
      return back;
    });
    return { next, result: count };
  });
  await audit(user, 'moderation.retour', snapshots.map((s) => s.id).join(', ').slice(0, 200));
  return n;
}

/* ------------------------------------------------------------------ */
/* Les règles                                                           */
/* ------------------------------------------------------------------ */

export function checkRules(raw: unknown): { rules: Pick<ModerationRules, 'sparringMinAge' | 'otherMinAge' | 'premoderation'> | null; errors: Record<string, string> } {
  const o = (raw ?? {}) as Record<string, unknown>;
  const errors: Record<string, string> = {};
  const s = o.sparringMinAge;
  const other = o.otherMinAge;
  if (!Number.isInteger(s) || (s as number) < 16 || (s as number) > 30) errors.sparringMinAge = 'team.rules.err.sparring';
  if (!Number.isInteger(other) || (other as number) < 14 || (other as number) > 21) errors.otherMinAge = 'team.rules.err.other';
  if (!errors.sparringMinAge && !errors.otherMinAge && (other as number) > (s as number)) errors.otherMinAge = 'team.rules.err.order';
  if (typeof o.premoderation !== 'boolean') errors.premoderation = 'team.rules.err.premoderation';
  if (Object.keys(errors).length) return { rules: null, errors };
  return { rules: { sparringMinAge: s as number, otherMinAge: other as number, premoderation: o.premoderation as boolean }, errors };
}

export async function saveRules(user: SessionUser, rules: Pick<ModerationRules, 'sparringMinAge' | 'otherMinAge' | 'premoderation'>): Promise<ModerationRules> {
  const saved = await update('regles', (cur) => {
    const next: ModerationRules = { ...cur, ...rules, updatedAt: new Date().toISOString(), updatedBy: user.name };
    return { next, result: { before: cur, next } };
  });
  await audit(user, 'moderation.regles', 'regles', `sparring ${saved.before.sparringMinAge} → ${rules.sparringMinAge} ans · autres ${saved.before.otherMinAge} → ${rules.otherMinAge} ans · prémodération ${rules.premoderation ? 'oui' : 'non'}`);
  return saved.next;
}

/* ------------------------------------------------------------------ */
/* Exemples                                                             */
/* ------------------------------------------------------------------ */

/** La prochaine date (à partir de demain + `after` jours) qui tombe un jour `jour`. */
function nextOn(jour: number, today: string, after = 1): string {
  let d = addDays(today, after);
  for (let i = 0; i < 7 && weekdayOf(d) !== jour; i++) d = addDays(d, 1);
  return d;
}

/**
 * Neuf propositions plausibles, posées sur les vrais créneaux d'accès libre du
 * planning quand il y en a : une saine, les deux exemples du CDC §11, un
 * numéro de téléphone, un pseudo Instagram, un sparring de mineur, un âge
 * inconnu, une un dimanche (club fermé, donc hors accès libre), une déjà en
 * ligne et une déjà retirée.
 */
export async function seedDemo(user: SessionUser): Promise<number> {
  const slots = await currentSlots();
  const today = parisNow().ymd;
  const free = (club: ClubId) => slots.filter((s) => s.club === club && isFree(s)).sort((a, b) => a.jour - b.jour || a.debut - b.debut);
  const at = (club: ClubId, i: number, fallback: { jour: number; debut: number }) => {
    const f = free(club);
    const s = f[i % Math.max(1, f.length)];
    return s ? { jour: s.jour, debut: Math.min(s.debut + 30, s.fin - 30) } : fallback;
  };
  const created = (h: number) => new Date(Date.now() - h * 3600_000).toISOString();
  type Seed = Omit<TrainingProposal, 'id' | 'createdAt' | 'date' | 'debut' | 'demo'> & { when: { jour: number; debut: number }; after?: number; hoursAgo: number };
  const sc = (i: number) => at('saint-cyprien', i, { jour: 1, debut: 14 * 60 + 45 });
  const seeds: Seed[] = [
    { type: 'sparring-anglaise', club: 'saint-cyprien', when: sc(3), niveau: 'Intermédiaire', observation: 'Je pèse 80 kg, j’ai un niveau intermédiaire en boxe et je cherche un partenaire pour une séance de mise de gants.', organizer: { memberId: '48777', prenom: 'Yanis', age: 24 }, participants: 1, status: 'a-verifier', hoursAgo: 3 },
    { type: 'footing', club: 'minimes', when: { jour: 5, debut: 9 * 60 + 30 }, niveau: 'Débutant', observation: 'Je propose un footing de 10 km au départ du club des Minimes, direction le canal du Midi, puis retour au club.', organizer: { memberId: '48102', prenom: 'Inès', age: 31 }, participants: 4, status: 'a-verifier', hoursAgo: 5 },
    { type: 'training-collectif', club: 'saint-cyprien', when: sc(6), niveau: 'Intermédiaire', observation: 'Circuit de préparation physique, 45 minutes. Écris-moi au 06 12 34 56 78 pour t’organiser.', organizer: { memberId: '48311', prenom: 'Karim', age: 27 }, participants: 0, status: 'a-verifier', hoursAgo: 7 },
    { type: 'sparring-pieds-poings', club: 'etats-unis', when: at('etats-unis', 0, { jour: 0, debut: 14 * 60 }), niveau: 'Débutant', observation: 'Sparring léger, protections obligatoires, on travaille la distance.', organizer: { memberId: '48590', prenom: 'Lucas', age: 16 }, participants: 2, status: 'a-verifier', hoursAgo: 9 },
    { type: 'sparring-sol', club: 'ramonville', when: { jour: 6, debut: 11 * 60 }, niveau: 'Confirmé', observation: 'Grappling sans kimono, rounds de cinq minutes.', organizer: { memberId: '48044', prenom: 'Mehdi', age: 29 }, participants: 1, status: 'a-verifier', hoursAgo: 12 },
    { type: 'training-collectif', club: 'saint-cyprien', when: sc(8), niveau: 'Débutant', observation: 'Programme cardio et gainage, retrouvez-moi sur insta @sarah.boxe pour le détail.', organizer: { memberId: '48233', prenom: 'Sarah', age: 22 }, participants: 0, status: 'a-verifier', hoursAgo: 20 },
    { type: 'sparring-sol', club: 'saint-cyprien', when: sc(1), niveau: 'Intermédiaire', observation: 'Travail des sorties de garde, rythme tranquille.', organizer: { memberId: '48420', prenom: 'Adam' }, participants: 0, status: 'a-verifier', hoursAgo: 26 },
    { type: 'sparring-anglaise', club: 'saint-cyprien', when: sc(0), niveau: 'Confirmé', observation: 'Mise de gants technique, 6 rounds de 2 minutes, casque et protège-dents.', organizer: { memberId: '48155', prenom: 'Thomas', age: 35 }, participants: 3, status: 'en-ligne', decision: { by: 'Accueil · Saint-Cyprien', at: created(30) }, hoursAgo: 34 },
    { type: 'training-collectif', club: 'portet', when: { jour: 3, debut: 19 * 60 }, niveau: 'Débutant', observation: 'Séance cardio, ambiance détente, on finit par une bière au bar d’à côté.', organizer: { memberId: '48666', prenom: 'Nora', age: 19 }, participants: 2, status: 'retiree', decision: { by: 'Direction', at: created(40), motif: 'propos', note: 'Pas d’alcool dans une annonce du club.' }, hoursAgo: 46 },
  ];
  const n = await update('propositions', (list) => {
    const kept = list.filter((p) => !p.demo);
    const made: TrainingProposal[] = seeds.map((s, i) => {
      const { when, hoursAgo, after, ...rest } = s;
      return { ...rest, id: `demo-ent-${i + 1}`, date: nextOn(when.jour, today, after ?? 1), debut: when.debut, createdAt: created(hoursAgo), demo: true };
    });
    return { next: [...made, ...kept], result: made.length };
  });
  await audit(user, 'moderation.demo', 'propositions', `${n} exemples`);
  return n;
}

export async function purgeDemo(user: SessionUser): Promise<number> {
  const n = await update('propositions', (list) => {
    const kept = list.filter((p) => !p.demo);
    return { next: kept, result: list.length - kept.length };
  });
  await audit(user, 'moderation.demo.retrait', 'propositions', `${n} exemples`);
  return n;
}

/* ------------------------------------------------------------------ */
/* Ce que l'app lit et envoie                                           */
/* ------------------------------------------------------------------ */

export type ProposalInput = { type: TrainingType; club: ClubId; date: string; debut: number; niveau: Niveau; observation?: string; organizer: { memberId: string; prenom: string; age?: number } };

/** La proposition envoyée par l'app, vérifiée champ par champ ; chaque refus porte le nom du champ. */
export function checkProposalInput(raw: unknown, today: string): { input: ProposalInput | null; errors: string[] } {
  const o = (raw ?? {}) as Record<string, unknown>;
  const errors: string[] = [];
  if (!TRAINING_TYPES.includes(o.type as TrainingType)) errors.push('type');
  if (!isClubId(o.club)) errors.push('club');
  const date = typeof o.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(o.date) ? o.date : null;
  if (!date || Number.isNaN(Date.parse(`${date}T12:00:00Z`)) || date < today || date > addDays(today, 60)) errors.push('date');
  let debut: number | null = null;
  if (Number.isInteger(o.debut)) debut = o.debut as number;
  else if (typeof o.heure === 'string') {
    const m = /^(\d{1,2}):(\d{2})$/.exec(o.heure);
    if (m) debut = Number(m[1]) * 60 + Number(m[2]);
  }
  if (debut === null || debut < 6 * 60 || debut > 23 * 60 || debut % 5) errors.push('heure');
  if (!NIVEAUX.includes(o.niveau as Niveau)) errors.push('niveau');
  const observation = typeof o.observation === 'string' ? o.observation.replace(/\s+/g, ' ').trim() : '';
  if (observation.length > 280) errors.push('observation');
  const org = (o.organisateur ?? o.organizer ?? {}) as Record<string, unknown>;
  const memberId = typeof org.memberId === 'string' ? org.memberId.trim() : '';
  const prenom = typeof org.prenom === 'string' ? org.prenom.replace(/\s+/g, ' ').trim() : '';
  if (!/^[A-Za-z0-9-]{3,64}$/.test(memberId)) errors.push('organisateur.memberId');
  if (!/^[\p{L}][\p{L}' -]{0,39}$/u.test(prenom)) errors.push('organisateur.prenom');
  const age = org.age === undefined || org.age === null ? undefined : Number.isInteger(org.age) && (org.age as number) >= 10 && (org.age as number) <= 99 ? (org.age as number) : NaN;
  if (Number.isNaN(age)) errors.push('organisateur.age');
  if (errors.length) return { input: null, errors };
  return {
    input: { type: o.type as TrainingType, club: o.club as ClubId, date: date!, debut: debut!, niveau: o.niveau as Niveau, ...(observation ? { observation } : {}), organizer: { memberId, prenom, ...(age !== undefined ? { age } : {}) } },
    errors,
  };
}

export async function submitFromApp(input: ProposalInput): Promise<{ id: string; status: 'a-verifier' | 'en-ligne'; checks: CheckCode[] }> {
  const ctx = await checkContext();
  const checks = checksFor(input, ctx);
  const status = ctx.rules.premoderation || blocking(checks) ? 'a-verifier' : 'en-ligne';
  const proposal: TrainingProposal = { ...input, id: newId('ent'), participants: 0, status, createdAt: new Date().toISOString() };
  await update('propositions', (list) => ({ next: [proposal, ...list].slice(0, 2000), result: undefined }));
  return { id: proposal.id, status, checks: checks.map((c) => c.code) };
}
