import { plagesLibres as plagesLibresContrat } from '@bc/contract';

import { clubById } from '@/data/clubs';
import type { Slot } from '@/data/planning';
import { planningSlots, usePlanningStore } from '@/state/planning';
import { useI18nStore, type Locale } from '@/i18n';
import { discipline, type ClubId } from '@/ui/theme';

/**
 * Les libellés de la direction sont hétérogènes ("BOXE EDUCATIVE 7/11 ANS",
 * "BOXE EDUCATIVE 7/11ANS", "BOXE ANGLAISE (LOISIRS)"). On les ramène à une
 * famille, un public et un libellé propre, sans toucher à la donnée source.
 */
export type Famille =
  | 'anglaise'
  | 'piedsPoings'
  | 'mma'
  | 'grappling'
  | 'crossTraining'
  | 'hyrox'
  | 'ladyPunch'
  | 'educative'
  | 'baby'
  | 'boxingCamp'
  | 'accesLibre';

export type Activite = {
  famille: Famille;
  libelle: string;
  public?: string;
  niveau?: string;
  /** Tranche d’âge visée quand le libellé la donne : [min, max]. */
  ages?: [number, number];
};

const FAMILLE_COLOR: Record<Famille, string> = discipline;

export function familleColor(f: Famille): string {
  return FAMILLE_COLOR[f];
}

function titleCase(s: string): string {
  return s
    .toLowerCase()
    .replace(/(^|[\s/(-])([a-zà-ÿ])/g, (m, p, c) => p + c.toUpperCase())
    .replace(/\bK1\b/gi, 'K1')
    .replace(/\bMma\b/g, 'MMA')
    .replace(/\bHiit\b/g, 'HIIT');
}

/** La langue de l’app au moment du rendu ; les écrans se redessinent quand elle change (ils lisent `useT`). */
const appLocale = (): Locale => useI18nStore.getState().locale;

/** Le libellé propre d’un cours, dans la langue de l’app (ou celle demandée, pour un texte partagé). */
export function normaliseActivite(raw: string, lang: Locale = appLocale()): Activite {
  const a = activiteFr(raw);
  return lang === 'en' ? activiteEn(a) : a;
}

/**
 * Les mots du planning en anglais. Les noms qui voyagent tels quels (MMA, Hyrox,
 * Lady punch, Boxing camp, Open sparring) ne changent pas.
 */
const LIBELLE_EN: Record<string, string> = {
  'Accès libre': 'Open gym',
  'Baby boxe': 'Baby boxing',
  'Préparation physique': 'Strength & conditioning',
  'Jiu-jitsu brésilien': 'Brazilian jiu-jitsu',
  'MMA (association)': 'MMA (club association)',
  'Boxe éducative': 'Youth boxing',
  'Boxe thaï / K1': 'Muay Thai / K1',
  'Boxe française': 'Savate',
  'Kick-boxing / K1': 'Kickboxing / K1',
  'Boxe pieds-poings': 'Kickboxing',
  'Boxe anglaise': 'Boxing',
};
const NIVEAU_EN: Record<string, string> = { Compétiteurs: 'Competitors', Confirmés: 'Experienced', Loisirs: 'Recreational', 'Amateurs et pros': 'Amateurs & pros' };
const PUBLIC_EN: Record<string, string> = { Ados: 'Teens', Enfants: 'Kids' };

function activiteEn(a: Activite): Activite {
  const en: Activite = { ...a, libelle: LIBELLE_EN[a.libelle] ?? a.libelle };
  if (a.public) en.public = PUBLIC_EN[a.public] ?? a.public.replace(/ ans$/, ' yrs');
  if (a.niveau) en.niveau = NIVEAU_EN[a.niveau] ?? a.niveau;
  return en;
}

/** Les salles d’États-Unis et de Portet (« Boxe », « Combat »…), dans la langue de l’app. */
const ESPACE_EN: Record<string, string> = { Boxe: 'Boxing', Combat: 'Fight room' };

export function espaceLabel(espace: string, lang: Locale = appLocale()): string {
  return lang === 'en' ? (ESPACE_EN[espace] ?? espace) : espace;
}

function activiteFr(raw: string): Activite {
  const s = raw.toUpperCase().replace(/\s+/g, ' ').trim();
  const age = s.match(/(\d{1,2})\s*\/\s*(\d{1,2})\s*ANS/);
  const publicAge = age ? `${age[1]}–${age[2]} ans` : undefined;
  const ages: [number, number] | undefined = age ? [Number(age[1]), Number(age[2])] : undefined;

  if (s.startsWith('ACCES LIBRE')) return { famille: 'accesLibre', libelle: 'Accès libre' };
  if (s.startsWith('BABY')) return { famille: 'baby', libelle: 'Baby boxe', public: publicAge ?? '3–6 ans', ages: ages ?? [3, 6] };
  if (s.includes('BOXING CAMP')) return { famille: 'boxingCamp', libelle: 'Boxing camp' };
  if (s.includes('HYROX')) return { famille: 'hyrox', libelle: 'Hyrox' };
  if (s.includes('CROSS')) return { famille: 'crossTraining', libelle: 'Cross-training' };
  if (s.includes('PREPARATION PHYSIQUE')) return { famille: 'crossTraining', libelle: 'Préparation physique' };
  if (s.includes('HIIT')) return { famille: 'crossTraining', libelle: 'Boxing HIIT' };
  if (s.includes('LADY')) {
    if (s.includes('KICK')) return { famille: 'ladyPunch', libelle: 'Lady kick' };
    return { famille: 'ladyPunch', libelle: s.includes('PUNCH') ? 'Lady punch' : 'Boxing lady' };
  }
  if (s.includes('GRAPPLING') || s.includes('JIU')) return { famille: 'grappling', libelle: s.includes('JIU') ? 'Jiu-jitsu brésilien' : 'Grappling' };
  if (s.includes('MMA')) {
    const enfants = s.includes('ENFANT');
    const ados = s.includes('ADOS');
    return { famille: 'mma', libelle: s.includes('ASSO') ? 'MMA (association)' : 'MMA', public: enfants ? (publicAge ?? '10–16 ans') : ados ? 'Ados' : undefined, ages: ages ?? (enfants ? [10, 16] : ados ? [12, 17] : undefined) };
  }
  if (s.includes('EDUCATIVE')) {
    const niveau = s.includes('COMP') ? 'Compétiteurs' : s.includes('CONFIRM') ? 'Confirmés' : undefined;
    const ados = s.includes('ADOS');
    const enfants = s.includes('ENFANT');
    const pub = publicAge ?? (ados ? '12–16 ans' : enfants ? '7–11 ans' : undefined);
    return { famille: 'educative', libelle: 'Boxe éducative', public: pub, niveau, ages: ages ?? (ados ? [12, 16] : enfants ? [7, 11] : [7, 16]) };
  }
  if (s.includes('PIEDS') || s.includes('KICK') || s.includes('THAI') || s.includes('K1') || s.includes('FRANCAISE')) {
    const lib = s.includes('THAI') ? 'Boxe thaï / K1' : s.includes('FRANCAISE') ? 'Boxe française' : s.includes('KICK') ? 'Kick-boxing / K1' : 'Boxe pieds-poings';
    const ados = s.includes('ADOS');
    const enfants = s.includes('ENFANT');
    return { famille: 'piedsPoings', libelle: lib, public: publicAge ?? (ados ? 'Ados' : enfants ? 'Enfants' : undefined), ages: ages ?? (ados ? [12, 17] : enfants ? [7, 11] : undefined) };
  }
  if (s.includes('SPARRING')) return { famille: 'anglaise', libelle: 'Open sparring', niveau: 'Confirmés' };
  if (s.includes('ANGLAISE') || s.includes('BOXE')) {
    const niveau = s.includes('COMP') ? 'Compétiteurs' : s.includes('LOISIR') ? 'Loisirs' : s.includes('PRO') ? 'Amateurs et pros' : undefined;
    return { famille: 'anglaise', libelle: 'Boxe anglaise', niveau };
  }
  return { famille: 'anglaise', libelle: titleCase(raw) };
}

/** Un cours convient-il à cet âge ? Sans tranche déclarée, un cours est pour les adultes (et ados avec accord). */
export function convientA(a: Activite, age: number): boolean {
  if (a.famille === 'accesLibre') return true;
  if (a.ages) return age >= a.ages[0] && age <= a.ages[1];
  return age >= 16;
}

export const JOURS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'] as const;
export const JOURS_COURTS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'] as const;

/** « 18h30 », « 10h » en français ; « 18:30 », « 10:00 » en anglais. */
export function heure(min: number, lang: Locale = appLocale()): string {
  const h = Math.floor(min / 60);
  const m = String(min % 60).padStart(2, '0');
  if (lang === 'en') return `${h}:${m}`;
  return min % 60 ? `${h}h${m}` : `${h}h`;
}

function allSlots(): Slot[] {
  return planningSlots();
}

export function slotsFor(club: ClubId, jour: number, espace?: string): Slot[] {
  return allSlots()
    .filter((s) => s.club === club && s.jour === jour && (!espace || !s.espace || s.espace === espace))
    .sort((a, b) => a.debut - b.debut);
}

export function espacesFor(club: ClubId): string[] {
  return [...new Set(allSlots().filter((s) => s.club === club && s.espace).map((s) => s.espace!))];
}

/** S'abonner au planning reseau pour redessiner planning, accueil et alertes. */
export function usePlanningSlots(): Slot[] {
  return usePlanningStore((st) => st.slots);
}

/** Jour de la semaine à la française (0 = lundi) pour une date. */
export function jourFr(d: Date): number {
  return (d.getDay() + 6) % 7;
}

/** Les créneaux d’accès libre du jour, pour la rubrique « entraînements entre membres ». */
export function accesLibreFor(club: ClubId, jour: number): Slot[] {
  return slotsFor(club, jour).filter((s) => normaliseActivite(s.activite).famille === 'accesLibre');
}

export type NextSession = { slot: Slot; activite: Activite; dansMinutes: number; jourLabel: string; offset: number; jour: number };

/**
 * La prochaine séance dans le club principal, hors accès libre, qui convient à
 * l’âge de l’adhérent : aujourd’hui après maintenant, sinon le prochain jour.
 */
export function nextSession(club: ClubId, now = new Date(), age = 30): NextSession | null {
  const today = jourFr(now);
  const nowMin = now.getHours() * 60 + now.getMinutes();
  for (let offset = 0; offset < 7; offset++) {
    const jour = (today + offset) % 7;
    const slots = slotsFor(club, jour).filter((s) => {
      const a = normaliseActivite(s.activite);
      return a.famille !== 'accesLibre' && convientA(a, age);
    });
    for (const slot of slots) {
      if (offset === 0 && slot.debut <= nowMin) continue;
      const dansMinutes = offset * 24 * 60 + slot.debut - nowMin;
      const jourLabel = offset === 0 ? "Aujourd’hui" : offset === 1 ? 'Demain' : JOURS[jour];
      return { slot, activite: normaliseActivite(slot.activite), dansMinutes, jourLabel, offset, jour };
    }
  }
  return null;
}

/** Le prochain cours suivi (étoile), tous clubs confondus, dans les sept jours. */
export function nextFavorite(favorites: string[], now = new Date()): NextSession | null {
  if (!favorites.length) return null;
  const today = jourFr(now);
  const nowMin = now.getHours() * 60 + now.getMinutes();
  for (let offset = 0; offset < 7; offset++) {
    const jour = (today + offset) % 7;
    const slots = allSlots().filter((s) => s.jour === jour && favorites.includes(s.id)).sort((a, b) => a.debut - b.debut);
    for (const slot of slots) {
      if (offset === 0 && slot.debut <= nowMin) continue;
      const dansMinutes = offset * 24 * 60 + slot.debut - nowMin;
      const jourLabel = offset === 0 ? "Aujourd’hui" : offset === 1 ? 'Demain' : JOURS[jour];
      return { slot, activite: normaliseActivite(slot.activite), dansMinutes, jourLabel, offset, jour };
    }
  }
  return null;
}

/** « aux Minimes », « à Saint-Cyprien », « aux États-Unis »… */
export function auClub(id: ClubId, court: string): string {
  if (id === 'minimes' || id === 'etats-unis') return `aux ${court}`;
  return `à ${court}`;
}

/** « Ce matin », « Cet après-midi », « Ce soir ». */
export function momentDuJour(now = new Date()): string {
  const h = now.getHours();
  if (h < 12) return 'Ce matin';
  if (h < 18) return 'Cet après-midi';
  return 'Ce soir';
}

export type Plage = { id: string; club: ClubId; jour: number; debut: number; fin: number; source: 'planning' | 'ouverture' };

/**
 * Les plages d’accès libre d’un jour : celles du planning quand la direction les
 * a écrites, sinon les heures d’ouverture du club (« l’accès libre suit
 * l’ouverture de la salle »). C’est là que vivent les propositions entre membres.
 */
export function plagesLibres(club: ClubId, jour: number): Plage[] {
  const { horaires, slots } = usePlanningStore.getState();
  if (horaires) {
    return plagesLibresContrat(slots, horaires[club] ?? [], club, jour).map((p) => ({
      id: p.slotId ?? `ouv-${club}-${jour}-${p.debut}`,
      club,
      jour,
      debut: p.debut,
      fin: p.fin,
      source: p.source,
    }));
  }
  const explicites = accesLibreFor(club, jour);
  if (explicites.length) return explicites.map((s) => ({ id: s.id, club, jour, debut: s.debut, fin: s.fin, source: 'planning' as const }));
  const o = clubById(club).ouverture;
  if (!o.jours.includes(jour)) return [];
  return [{ id: `ouv-${club}-${jour}`, club, jour, debut: o.debut, fin: o.fin, source: 'ouverture' as const }];
}

/** Les clubs qui proposent une famille de discipline, lus dans le planning réel ; jamais une liste écrite à la main. */
export function clubsProposant(f: Famille): ClubId[] {
  const ids: ClubId[] = [];
  for (const s of allSlots()) {
    if (normaliseActivite(s.activite).famille === f && !ids.includes(s.club)) ids.push(s.club);
  }
  return ids;
}
