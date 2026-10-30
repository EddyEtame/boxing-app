import type { MessageKey, Translate } from '@/i18n/messages';
import { memberName } from '@/lib/members/build';
import { LINK_REASONS, MISMATCH_FIELDS, type LinkStatus, type Member } from '@/lib/members/types';

/** Les mots de la rubrique Adhérents, les mêmes dans la file, l'annuaire, la fiche et la palette. */
export const nameOf = (t: Translate, m: Pick<Member, 'prenom' | 'nom'>): string => memberName(m) || t('adh.noName');

export const linkTag = (s: LinkStatus): string => (s === 'lie' ? 'tag tag-pos' : s === 'a_revoir' ? 'tag tag-warn' : 'tag');

export const fieldLabel = (t: Translate, field: string): string => ((MISMATCH_FIELDS as readonly string[]).includes(field) ? t(`adh.field.${field}` as MessageKey) : field.replace(/_/g, ' '));

export const reasonLabel = (t: Translate, reason: string): string => ((LINK_REASONS as readonly string[]).includes(reason) ? t(`adh.reason.${reason}` as MessageKey) : reason.replace(/_/g, ' '));
