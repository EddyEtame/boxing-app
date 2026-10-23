import { DEFAULT_DEMO, DEMO_MEMBER_ID, generatePassages } from '@bc/contract';

import { readCollection, updateCollection } from './store';
import type {
  ClubEvent,
  DemoState,
  FeatureKey,
  FeatureState,
  InboxThread,
  Media,
  ModerationRules,
  NewsItem,
  OutgoingMessage,
  PlanningState,
  PushNotification,
  TrainingProposal,
  VideoItem,
} from '@/lib/types';
import { FEATURE_KEYS } from '@/lib/types';

/**
 * Chaque collection a UN défaut, écrit ici et nulle part ailleurs : lire une
 * collection depuis deux modules avec deux défauts différents finirait par
 * écrire le mauvais. Les contenus démarrent vides (les états vides expliquent
 * et proposent de reprendre ce que l'app montre aujourd'hui).
 */
export type Prefs = Record<string, { tourDoneAt?: string }>;

const DEFAULT_FEATURES = (): FeatureState => {
  const state = {} as FeatureState;
  for (const key of FEATURE_KEYS) state[key] = { on: true };
  return state;
};

const DEFAULT_RULES = (): ModerationRules => ({ sparringMinAge: 18, otherMinAge: 16, premoderation: true });

export const DEFAULTS = {
  actualites: (): NewsItem[] => [],
  evenements: (): ClubEvent[] => [],
  videos: (): VideoItem[] => [],
  notifications: (): PushNotification[] => [],
  messagerie: (): InboxThread[] => [],
  envois: (): OutgoingMessage[] => [],
  propositions: (): TrainingProposal[] => [],
  regles: DEFAULT_RULES,
  fonctions: DEFAULT_FEATURES,
  preferences: (): Prefs => ({}),
  /** Vide tant que rien n'est importé : le premier accès reprend les créneaux de l'app (server/planning.ts). */
  plannings: (): PlanningState => ({ slots: [], exceptions: [], history: [], source: { path: '', hash: '', importedAt: '', count: 0 } }),
  /** Les fichiers déposés dans l'admin (la photothèque de l'app se lit sur le disque). */
  medias: (): (Media & { id: string; size: number; type: string; createdAt: string; createdBy: string })[] => [],
  /** La démo de départ : exactement l'historique local de l'app (même graine, même calcul). */
  demo: (): DemoState => ({ memberId: DEMO_MEMBER_ID, pattern: DEFAULT_DEMO, rolling: true, passages: generatePassages(DEFAULT_DEMO), updatedAt: new Date().toISOString(), updatedBy: 'systeme' }),
};

export type CollectionName = keyof typeof DEFAULTS;
type ValueOf<N extends CollectionName> = ReturnType<(typeof DEFAULTS)[N]>;

export function read<N extends CollectionName>(name: N): Promise<ValueOf<N>> {
  return readCollection<ValueOf<N>>(name, DEFAULTS[name] as () => ValueOf<N>);
}

export function update<N extends CollectionName, R = void>(name: N, mutate: (current: ValueOf<N>) => { next: ValueOf<N>; result: R } | Promise<{ next: ValueOf<N>; result: R }>): Promise<R> {
  return updateCollection<ValueOf<N>, R>(name, DEFAULTS[name] as () => ValueOf<N>, mutate);
}

/** Les interrupteurs, avec les clés ajoutées depuis la dernière écriture (allumées par défaut). */
export async function readFeatures(): Promise<FeatureState> {
  const stored = await read('fonctions');
  const full = DEFAULT_FEATURES();
  for (const key of FEATURE_KEYS) if (stored[key]) full[key] = stored[key];
  return full;
}

export async function isOn(key: FeatureKey): Promise<boolean> {
  return (await readFeatures())[key].on;
}
