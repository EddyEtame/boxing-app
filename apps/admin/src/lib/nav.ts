import type { MessageKey } from '@/i18n/messages';

import type { Capability } from './permissions';

/**
 * Le registre des rubriques : le rail, la palette de commandes, l'aide et la
 * visite guidée lisent tous cette liste. Chaque rubrique porte le paragraphe
 * du cahier des charges qui la demande.
 */
export type SectionId =
  | 'aujourdhui'
  | 'actualites'
  | 'evenements'
  | 'videos'
  | 'plannings'
  | 'messages'
  | 'notifications'
  | 'moderation'
  | 'adherents'
  | 'statistiques'
  | 'demo'
  | 'fonctions'
  | 'branchements'
  | 'deciplus'
  | 'comptes'
  | 'journal';

export type IconName =
  | 'ring'
  | 'news'
  | 'ticket'
  | 'play'
  | 'planning'
  | 'chat'
  | 'bell'
  | 'shieldCheck'
  | 'chart'
  | 'sliders'
  | 'toggle'
  | 'plug'
  | 'database'
  | 'users'
  | 'me'
  | 'journal';

export type Group = 'contenus' | 'club' | 'pilotage' | 'equipe';

export type Section = {
  id: SectionId;
  href: string;
  label: MessageKey;
  icon: IconName;
  capability: Capability;
  group?: Group;
  /** Paragraphe(s) du CDC. */
  cdc: string;
  /** Rubrique gardée dans la barre du bas sur téléphone. */
  mobile?: boolean;
};

export const SECTIONS: Section[] = [
  { id: 'aujourdhui', href: '/', label: 'nav.aujourdhui', icon: 'ring', capability: 'aujourdhui', cdc: '§15', mobile: true },
  { id: 'actualites', href: '/actualites', label: 'nav.actualites', icon: 'news', capability: 'actualites', group: 'contenus', cdc: '§8, §15' },
  { id: 'evenements', href: '/evenements', label: 'nav.evenements', icon: 'ticket', capability: 'evenements', group: 'contenus', cdc: '§8, §13, §15' },
  { id: 'videos', href: '/videos', label: 'nav.videos', icon: 'play', capability: 'videos', group: 'contenus', cdc: '§9, §15' },
  { id: 'plannings', href: '/plannings', label: 'nav.plannings', icon: 'planning', capability: 'plannings', group: 'club', cdc: '§7, §15', mobile: true },
  { id: 'messages', href: '/messages', label: 'nav.messages', icon: 'chat', capability: 'messages', group: 'club', cdc: '§10, §15', mobile: true },
  { id: 'notifications', href: '/notifications', label: 'nav.notifications', icon: 'bell', capability: 'notifications', group: 'club', cdc: '§14, §15' },
  { id: 'moderation', href: '/moderation', label: 'nav.moderation', icon: 'shieldCheck', capability: 'moderation', group: 'club', cdc: '§11, §15', mobile: true },
  { id: 'adherents', href: '/adherents', label: 'nav.adherents', icon: 'me', capability: 'adherents', group: 'club', cdc: '§2, §15' },
  { id: 'statistiques', href: '/statistiques', label: 'nav.statistiques', icon: 'chart', capability: 'statistiques', group: 'pilotage', cdc: '§15' },
  { id: 'demo', href: '/statistiques/demo', label: 'nav.demo', icon: 'sliders', capability: 'demo', group: 'pilotage', cdc: '§6' },
  { id: 'fonctions', href: '/fonctions', label: 'nav.fonctions', icon: 'toggle', capability: 'fonctions', group: 'pilotage', cdc: '§11E, §15' },
  { id: 'branchements', href: '/branchements', label: 'nav.branchements', icon: 'plug', capability: 'branchements', group: 'pilotage', cdc: '§17, §18' },
  { id: 'deciplus', href: '/deciplus', label: 'nav.deciplus', icon: 'database', capability: 'deciplus', group: 'pilotage', cdc: '§2, §15, §18A' },
  { id: 'comptes', href: '/comptes', label: 'nav.comptes', icon: 'users', capability: 'comptes', group: 'equipe', cdc: '§15' },
  { id: 'journal', href: '/comptes/journal', label: 'nav.journal', icon: 'journal', capability: 'journal', group: 'equipe', cdc: '§17' },
];

export const GROUPS: Group[] = ['contenus', 'club', 'pilotage', 'equipe'];

/** La rubrique d'une adresse (la plus longue qui correspond). */
export function sectionFor(pathname: string): Section {
  let best: Section = SECTIONS[0]!;
  for (const s of SECTIONS) {
    if (s.href === '/') continue;
    if ((pathname === s.href || pathname.startsWith(`${s.href}/`)) && s.href.length > (best.href === '/' ? 0 : best.href.length)) best = s;
  }
  return best;
}
