import { format, frTypo, type Locale, type Vars } from './core';
import * as common from './dict/common';
import * as comms from './dict/comms';
import * as content from './dict/content';
import * as demo from './dict/demo';
import * as help from './dict/help';
import * as planning from './dict/planning';
import * as shell from './dict/shell';
import * as stats from './dict/stats';
import * as system from './dict/system';
import * as team from './dict/team';

/**
 * Le dictionnaire complet, par langue. Chaque fichier de `dict/` porte la paire
 * français / anglais d'un domaine ; le type de l'anglais exige toutes les clés
 * du français : une traduction manquante est une erreur de compilation.
 */
const FR_SOURCE = {
  ...common.fr,
  ...shell.fr,
  ...help.fr,
  ...demo.fr,
  ...stats.fr,
  ...planning.fr,
  ...content.fr,
  ...comms.fr,
  ...team.fr,
  ...system.fr,
};

export type MessageKey = keyof typeof FR_SOURCE;
export type Messages = Record<MessageKey, string>;

const FR = Object.fromEntries(Object.entries(FR_SOURCE).map(([k, v]) => [k, frTypo(v)])) as Messages;

const EN: Messages = {
  ...common.en,
  ...shell.en,
  ...help.en,
  ...demo.en,
  ...stats.en,
  ...planning.en,
  ...content.en,
  ...comms.en,
  ...team.en,
  ...system.en,
};

export function messagesFor(locale: Locale): Messages {
  return locale === 'en' ? EN : FR;
}

export type Translate = (key: MessageKey, vars?: Vars) => string;

export function translator(locale: Locale, messages: Messages = messagesFor(locale)): Translate {
  return (key, vars) => format(locale, messages[key] ?? key, vars);
}
