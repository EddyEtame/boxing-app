import type { FeatureKey } from '@/lib/types';

/**
 * Les interrupteurs, rangés comme l'adhérent les rencontre dans l'app.
 * `parent` : la catégorie ne compte que si la rubrique est allumée.
 * `heavy` : couper demande une confirmation (ce que l'adhérent perd est lourd).
 * `enforcedBy` : `admin` quand l'admin refuse déjà lui-même (son API) ;
 * `app` quand c'est l'app qui doit lire l'interrupteur (GET /api/fonctions).
 */
export type FeatureMeta = { key: FeatureKey; parent?: FeatureKey; heavy?: boolean; enforcedBy: 'admin' | 'app' };

export const FEATURE_GROUPS: { id: 'adherents' | 'entrainements' | 'contenus' | 'pilotage'; cdc: string; items: FeatureMeta[] }[] = [
  {
    id: 'adherents',
    cdc: '§3, §4, §10',
    items: [
      { key: 'inscription', enforcedBy: 'app' },
      { key: 'badge', heavy: true, enforcedBy: 'app' },
      { key: 'messagerie', heavy: true, enforcedBy: 'admin' },
    ],
  },
  {
    id: 'entrainements',
    cdc: '§11',
    items: [
      { key: 'entrainements', heavy: true, enforcedBy: 'admin' },
      { key: 'entrainements.sparring-anglaise', parent: 'entrainements', enforcedBy: 'admin' },
      { key: 'entrainements.sparring-pieds-poings', parent: 'entrainements', enforcedBy: 'admin' },
      { key: 'entrainements.sparring-sol', parent: 'entrainements', enforcedBy: 'admin' },
      { key: 'entrainements.training-collectif', parent: 'entrainements', enforcedBy: 'admin' },
      { key: 'entrainements.footing', parent: 'entrainements', enforcedBy: 'admin' },
    ],
  },
  {
    id: 'contenus',
    cdc: '§9, §12, §13',
    items: [
      { key: 'videos', enforcedBy: 'app' },
      { key: 'combats', enforcedBy: 'app' },
      { key: 'boutique', enforcedBy: 'app' },
    ],
  },
  {
    id: 'pilotage',
    cdc: '§6, §14, §15',
    items: [
      { key: 'statistiques', enforcedBy: 'app' },
      { key: 'notifications.promo', enforcedBy: 'app' },
      { key: 'mesure', heavy: true, enforcedBy: 'admin' },
      { key: 'demo', enforcedBy: 'admin' },
    ],
  },
];

export const FEATURE_META: Record<FeatureKey, FeatureMeta> = Object.fromEntries(FEATURE_GROUPS.flatMap((g) => g.items.map((i) => [i.key, i]))) as Record<FeatureKey, FeatureMeta>;
