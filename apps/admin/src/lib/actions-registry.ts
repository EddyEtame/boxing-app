import type { MessageKey } from '@/i18n/messages';

import type { IconName } from './nav';
import type { Capability } from './permissions';

/**
 * Tout ce qui se crée dans l'admin, en un endroit : la palette (Ctrl K), le
 * bouton « Créer » et les raccourcis d'« Aujourd'hui » lisent cette liste.
 * Chaque création ouvre l'assistant de sa rubrique (`?nouveau=…`).
 */
export type CreateAction = {
  id: string;
  label: MessageKey;
  hint: MessageKey;
  href: string;
  capability: Capability;
  icon: IconName;
  keywords: string;
};

export const CREATE_ACTIONS: CreateAction[] = [
  { id: 'actualite', label: 'create.actualite', hint: 'create.actualite.hint', href: '/actualites?nouveau=1', capability: 'actualites', icon: 'news', keywords: 'news actualite article publier résultat portrait promo' },
  { id: 'evenement', label: 'create.evenement', hint: 'create.evenement.hint', href: '/evenements?nouveau=1', capability: 'evenements', icon: 'ticket', keywords: 'event gala combat stage competition billetterie' },
  { id: 'video', label: 'create.video', hint: 'create.video.hint', href: '/videos?nouveau=1', capability: 'videos', icon: 'play', keywords: 'video tutoriel coach technique' },
  { id: 'cours', label: 'create.cours', hint: 'create.cours.hint', href: '/plannings?nouveau=ajout', capability: 'plannings.edit', icon: 'planning', keywords: 'cours planning creneau ajouter class' },
  { id: 'deplacer', label: 'create.deplacer', hint: 'create.deplacer.hint', href: '/plannings?nouveau=deplacement', capability: 'plannings.edit', icon: 'planning', keywords: 'deplacer cours planning horaire move' },
  { id: 'annuler', label: 'create.annuler', hint: 'create.annuler.hint', href: '/plannings?nouveau=annulation', capability: 'plannings.edit', icon: 'planning', keywords: 'annuler cours seance absent cancel' },
  { id: 'notification', label: 'create.notification', hint: 'create.notification.hint', href: '/notifications?nouveau=1', capability: 'notifications', icon: 'bell', keywords: 'notification push envoyer annonce' },
  { id: 'message', label: 'create.message', hint: 'create.message.hint', href: '/messages?nouveau=1', capability: 'messages', icon: 'chat', keywords: 'message adherent groupe ecrire' },
  { id: 'compte', label: 'create.compte', hint: 'create.compte.hint', href: '/comptes?nouveau=1', capability: 'comptes', icon: 'users', keywords: 'compte equipe coach acces droits utilisateur' },
  { id: 'demo', label: 'create.demo', hint: 'create.demo.hint', href: '/statistiques/demo', capability: 'demo', icon: 'sliders', keywords: 'demo passages statistiques presentation' },
];
