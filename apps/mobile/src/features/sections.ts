import type { ComponentType } from 'react';

import type { MessageKey } from '@/i18n';
import type { BarSlot } from '@/state/prefs';
import {
  IconBadge,
  IconBag,
  IconBelt,
  IconCard,
  IconChart,
  IconChat,
  IconDisciplines,
  IconGrid,
  IconNews,
  IconPlanning,
  IconRing,
  IconShop,
  IconUsers,
  type IconProps,
} from '@/ui/icons';

/**
 * Le registre des rubriques : ce que la barre peut porter, ce que Plus range.
 * Les dix rubriques du menu recommandé (CDC §16) sont toutes ici, à deux
 * gestes au plus ; la barre en montre cinq, l'adhérent choisit trois d'entre elles.
 */
export type SectionId = BarSlot | 'home' | 'plus' | 'equipe' | 'disciplines' | 'combats' | 'boutique';

export type Section = {
  id: SectionId;
  icon: ComponentType<IconProps>;
  /** Libellé court (barre). */
  label: MessageKey;
  /** Libellé long (grille de Plus). */
  title: MessageKey;
  sub: MessageKey;
  href: string;
  /** Réservé aux abonnés actifs (CDC §3B) : visible, cadenassé pour les autres (CDC §16). */
  members?: boolean;
  /** Lien externe (boutique, CDC §12 : paiement hors de l'app). */
  external?: string;
};

export const BOUTIQUE_URL = 'https://boutique.boxingcenter.fr/';

export const SECTIONS: Record<SectionId, Section> = {
  home: { id: 'home', icon: IconRing, label: 'tabs.home', title: 'tabs.home', sub: 'sections.homeSub', href: '/' },
  planning: { id: 'planning', icon: IconPlanning, label: 'tabs.planning', title: 'sections.planning', sub: 'sections.planningSub', href: '/planning' },
  badge: { id: 'badge', icon: IconBadge, label: 'tabs.badge', title: 'sections.badge', sub: 'sections.badgeSub', href: '/badge' },
  messages: { id: 'messages', icon: IconChat, label: 'tabs.messages', title: 'sections.messages', sub: 'sections.messagesSub', href: '/messages', members: true },
  entrainer: { id: 'entrainer', icon: IconBag, label: 'tabs.train', title: 'sections.train', sub: 'sections.trainSub', href: '/entrainer' },
  stats: { id: 'stats', icon: IconChart, label: 'tabs.stats', title: 'sections.stats', sub: 'sections.statsSub', href: '/stats', members: true },
  abonnement: { id: 'abonnement', icon: IconCard, label: 'tabs.subscription', title: 'sections.subscription', sub: 'sections.subscriptionSub', href: '/abonnement', members: true },
  actualites: { id: 'actualites', icon: IconNews, label: 'tabs.news', title: 'sections.news', sub: 'sections.newsSub', href: '/actualites' },
  equipe: { id: 'equipe', icon: IconUsers, label: 'sections.team', title: 'sections.team', sub: 'sections.teamSub', href: '/equipe' },
  disciplines: { id: 'disciplines', icon: IconDisciplines, label: 'sections.disciplines', title: 'sections.disciplines', sub: 'sections.disciplinesSub', href: '/disciplines' },
  combats: { id: 'combats', icon: IconBelt, label: 'sections.fights', title: 'sections.fights', sub: 'sections.fightsSub', href: '/combats' },
  boutique: { id: 'boutique', icon: IconShop, label: 'sections.shop', title: 'sections.shop', sub: 'sections.shopSub', href: BOUTIQUE_URL, external: BOUTIQUE_URL },
  plus: { id: 'plus', icon: IconGrid, label: 'tabs.plus', title: 'tabs.plus', sub: 'sections.plusSub', href: '/plus' },
};

/** L'ordre de la grille de Plus. */
export const PLUS_GRID: SectionId[] = ['planning', 'badge', 'messages', 'abonnement', 'stats', 'entrainer', 'actualites', 'combats', 'equipe', 'disciplines', 'boutique'];
