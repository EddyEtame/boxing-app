import { Platform, Share } from 'react-native';

import { clubById } from '@/data/clubs';
import type { Slot } from '@/data/planning';
import { espaceLabel, heure, normaliseActivite, slotsFor } from '@/features/planning/model';
import { WEEKDAYS, WEEKDAYS_SHORT } from '@/features/time';
import type { Locale } from '@/i18n';
import type { ClubId } from '@/ui/theme';

/**
 * Partager un planning ou une séance : du texte propre, lisible dans
 * WhatsApp, Messages ou un mail. Le partage d'affiche en image viendra avec
 * un module natif (react-native-view-shot), noté dans les questions.
 */
export async function shareText(message: string, title: string): Promise<boolean> {
  try {
    if (Platform.OS === 'web') {
      const nav = typeof navigator !== 'undefined' ? navigator : undefined;
      if (nav?.share) {
        await nav.share({ title, text: message });
        return true;
      }
      if (nav?.clipboard) {
        await nav.clipboard.writeText(message);
        return true;
      }
      return false;
    }
    const r = await Share.share({ message, title }, { dialogTitle: title, subject: title });
    return r.action !== Share.dismissedAction;
  } catch {
    return false;
  }
}

const appLine = (lang: Locale) => (lang === 'fr' ? 'Planning complet et accès libre dans l’app Boxing Center.' : 'Full schedule and open gym hours in the Boxing Center app.');

export function sessionText(slot: Slot, jour: number, lang: Locale): string {
  const a = normaliseActivite(slot.activite, lang);
  const c = clubById(slot.club);
  const meta = [a.public, a.niveau, slot.espace ? espaceLabel(slot.espace, lang) : undefined].filter(Boolean).join(' · ');
  const when = `${WEEKDAYS[lang][jour]} ${heure(slot.debut, lang)}–${heure(slot.fin, lang)}`;
  return [`${a.libelle} · ${when}`, `Boxing Center ${c.court}${meta ? ` · ${meta}` : ''}`, `${c.rue}, ${c.ville}`, '', appLine(lang)].join('\n');
}

export function weekText(club: ClubId, lang: Locale, espace?: string): string {
  const c = clubById(club);
  const lines: string[] = [`Boxing Center ${c.court}${espace ? ` · ${espaceLabel(espace, lang)}` : ''} — ${lang === 'fr' ? 'planning de la semaine' : 'weekly schedule'}`, ''];
  for (let j = 0; j < 7; j++) {
    const courses = slotsFor(club, j, espace).filter((s) => normaliseActivite(s.activite).famille !== 'accesLibre');
    if (!courses.length) continue;
    lines.push(`${WEEKDAYS_SHORT[lang][j]} · ${courses.map((s) => `${heure(s.debut, lang)} ${normaliseActivite(s.activite, lang).libelle}`).join(' · ')}`);
  }
  lines.push('', `${c.rue}, ${c.ville}`, appLine(lang));
  return lines.join('\n');
}

export function shareSession(slot: Slot, jour: number, lang: Locale) {
  return shareText(sessionText(slot, jour, lang), normaliseActivite(slot.activite, lang).libelle);
}

export function shareWeek(club: ClubId, lang: Locale, espace?: string) {
  return shareText(weekText(club, lang, espace), `Boxing Center ${clubById(club).court}`);
}
