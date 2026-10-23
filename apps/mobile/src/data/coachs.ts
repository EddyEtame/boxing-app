import type { PhotoSource } from '@/ui/Photo';
import type { ClubId } from '@/ui/theme';

/**
 * Les coachs et les boxeurs du réseau (CDC §3A « portraits et reportages »).
 * Chaque fiche vient du site du club concerné, relevé le 2026-10-17 : Minimes
 * (content.json), Saint-Cyprien (data.js), États-Unis (index.html), Ramonville
 * (JSON-LD de la page Coachs), Portet (content.json). Aucun palmarès n’est écrit
 * ici qu’un club n’ait publié lui-même. Pas d’emploi du temps : l’heure d’un
 * cours vit dans le planning, jamais sur une personne.
 */
export type Personne = {
  id: string;
  type: 'coach' | 'boxeur';
  nom: string;
  initiales: string;
  /** Ce qu’il enseigne, ou sa place dans l’équipe. */
  role: string;
  /** Une phrase : le palmarès publié par le club, ou son trait. */
  note?: string;
  /** Étiquette courte : « Head coach », « Pro », « Champion du monde ». */
  tag?: string;
  /** Les mêmes champs, en anglais. */
  en: { role: string; note?: string; tag?: string };
  clubs: ClubId[];
  photo?: PhotoSource;
};

export const PERSONNES: Personne[] = [
  // Minimes — boxingcenter-minimes (content.json → coaches)
  { id: 'mehdi', type: 'coach', nom: 'Mehdi', initiales: 'M', role: 'Coach principal · Boxe anglaise, compétiteurs, école', tag: 'Le patron de la maison', note: 'Présent dans la salle du lundi au samedi.', en: { role: 'Head coach · Boxing, competitors, school', tag: 'The boss of the house', note: 'In the gym Monday to Saturday.' }, clubs: ['minimes'], photo: require('@/assets/portraits/coach-mehdi.jpg') },
  { id: 'chloe', type: 'coach', nom: 'Chloé', initiales: 'C', role: 'Boxing Lady', note: 'Elle mène la bande du Boxing Lady, et elle ne lâche rien.', en: { role: 'Boxing Lady', note: 'She leads the Boxing Lady crew, and she never lets up.' }, clubs: ['minimes'] },
  { id: 'david', type: 'coach', nom: 'David', initiales: 'D', role: 'Boxing Lady · Pieds-poings', note: 'Le Boxing Lady, puis les pieds-poings dans la foulée. Le geste propre, la garde haute.', en: { role: 'Boxing Lady · Kickboxing', note: 'Boxing Lady, then kickboxing straight after. Clean technique, guard up.' }, clubs: ['minimes'] },
  { id: 'clement', type: 'coach', nom: 'Clément', initiales: 'C', role: 'Boxing camp', note: 'Le boxing camp. Le cardio qui te construit une caisse.', en: { role: 'Boxing camp', note: 'Boxing camp. The cardio that builds your engine.' }, clubs: ['minimes'] },
  { id: 'elyasse-azap', type: 'boxeur', nom: 'Elyasse Azap', initiales: 'EA', role: 'Boxe anglaise · compétiteur', en: { role: 'Boxing · competitor' }, clubs: ['minimes'], photo: require('@/assets/portraits/boxeur-elyasse-azap.jpg') },
  { id: 'johnson-suffo', type: 'boxeur', nom: 'Johnson Suffo', initiales: 'JS', role: 'Boxe anglaise · professionnel', tag: 'Pro', note: 'Boxeur professionnel. Il encadre le stage des vacances aux Minimes avec Mehdi.', en: { role: 'Boxing · professional', tag: 'Pro', note: 'Professional boxer. He runs the holiday camp at Minimes with Mehdi.' }, clubs: ['minimes'], photo: require('@/assets/portraits/boxeur-johnson-suffo.jpg') },
  { id: 'salomon-kitoko', type: 'boxeur', nom: 'Salomon Kitoko', initiales: 'SK', role: 'Boxe anglaise · compétiteur', en: { role: 'Boxing · competitor' }, clubs: ['minimes'], photo: require('@/assets/portraits/boxeur-salomon-kitoko.jpg') },

  // Saint-Cyprien — bc-st-cyprien (data.js → COACHES)
  { id: 'dadi', type: 'coach', nom: 'Dadi', initiales: 'D', role: 'Boxe anglaise · Lady Punch · École', tag: 'Le pilier', en: { role: 'Boxing · Lady Punch · School', tag: 'The pillar' }, clubs: ['saint-cyprien'], photo: require('@/assets/portraits/coach-dadi.jpg') },
  { id: 'tawee', type: 'coach', nom: 'Tawee', initiales: 'T', role: 'Boxe thaï · K1', tag: 'L’art thaï', en: { role: 'Muay Thai · K1', tag: 'The Thai art' }, clubs: ['saint-cyprien'], photo: require('@/assets/portraits/coach-tawee.jpg') },
  { id: 'brice', type: 'coach', nom: 'Brice', initiales: 'B', role: 'Hyrox · Cross-training · Boxing camp', tag: 'Le moteur', en: { role: 'Hyrox · Cross-training · Boxing camp', tag: 'The engine' }, clubs: ['saint-cyprien'], photo: require('@/assets/portraits/coach-brice.jpg') },

  // États-Unis — boxing_center_etats_unis (index.html → section Coachs)
  { id: 'renaud-chavaudra', type: 'coach', nom: 'Renaud Chavaudra', initiales: 'RC', role: 'Coach référent · Pieds-poings, K1, savate', tag: 'Coach référent', note: 'Plusieurs fois champion de France en full contact et kick-boxing.', en: { role: 'Lead coach · Kickboxing, K1, savate', tag: 'Lead coach', note: 'Several-time French champion in full contact and kickboxing.' }, clubs: ['etats-unis'], photo: require('@/assets/portraits/etats-unis-renaud.jpg') },
  { id: 'zouhir-boumenir', type: 'coach', nom: 'Zouhir Boumenir', initiales: 'ZB', role: 'Grappling · Jiu-jitsu brésilien', note: 'Ceinture noire de jiu-jitsu brésilien. Le sol, progressif, du premier cours au niveau confirmé.', en: { role: 'Grappling · Brazilian jiu-jitsu', note: 'Brazilian jiu-jitsu black belt. Groundwork, step by step, from your first class to advanced level.' }, clubs: ['etats-unis'], photo: require('@/assets/portraits/etats-unis-zouhir.jpg') },

  // Ramonville — bc-ramonville (page Coachs, JSON-LD)
  { id: 'jerome', type: 'coach', nom: 'Jérôme', initiales: 'J', role: 'Head coach · MMA, grappling, préparation physique', tag: 'Head coach', en: { role: 'Head coach · MMA, grappling, strength & conditioning', tag: 'Head coach' }, clubs: ['ramonville'], photo: require('@/assets/portraits/ramonville-jerome.jpg') },
  { id: 'sonia', type: 'coach', nom: 'Sonia', initiales: 'S', role: 'Boxe thaï · Kickboxing · Boxing Lady · Préparation physique', en: { role: 'Muay Thai · Kickboxing · Boxing Lady · Strength & conditioning' }, clubs: ['ramonville'], photo: require('@/assets/portraits/ramonville-sonia.jpg') },
  { id: 'hicham', type: 'coach', nom: 'Hicham', initiales: 'H', role: 'Boxe anglaise · Préparation physique', en: { role: 'Boxing · Strength & conditioning' }, clubs: ['ramonville'], photo: require('@/assets/portraits/ramonville-hicham.jpg') },
  { id: 'farouk', type: 'coach', nom: 'Farouk', initiales: 'F', role: 'Boxe anglaise · loisirs et compétiteurs', en: { role: 'Boxing · recreational and competitors' }, clubs: ['ramonville'], photo: require('@/assets/portraits/ramonville-farouk.jpg') },
  { id: 'valentin-guth', type: 'coach', nom: 'Valentin Guth', initiales: 'VG', role: 'Boxe loisirs · Boxe éducative · École enfants', tag: 'Pro', note: 'Boxeur professionnel : 3 victoires, 1 défaite, 1 nul. 3ᵉ Français chez les super-coqs.', en: { role: 'Recreational boxing · Youth boxing · Kids school', tag: 'Pro', note: 'Professional boxer: 3 wins, 1 loss, 1 draw. Ranked third in France at super bantamweight.' }, clubs: ['ramonville'], photo: require('@/assets/portraits/ramonville-valentin.jpg') },

  // Portet — boxing-center-portet (content.json → team)
  { id: 'valentin-tapia', type: 'coach', nom: 'Valentin Tapia', initiales: 'VT', role: 'Head coach · Responsable sportif · Boxe loisirs, éducative, compétiteurs', tag: 'Head coach', note: 'Double diplômé BPJEPS, formateur de champions de France et de membres de l’équipe de France. « Le talent te fait commencer. L’exigence te fait gagner. »', en: { role: 'Head coach · Head of sport · Recreational, youth and competitive boxing', tag: 'Head coach', note: 'Holds two BPJEPS coaching diplomas; has trained French champions and French national team members. “Talent gets you started. High standards make you win.”' }, clubs: ['portet'], photo: require('@/assets/portraits/portet-valentin-tapia.jpg') },
  { id: 'samuel-pinto', type: 'coach', nom: 'Samuel Pinto', initiales: 'SP', role: 'Kick-boxing · K1 · Boxe française · Lady Boxing · Kick enfants et ados', note: 'Vice-champion d’Europe et du Monde en boxe française, combattant semi-pro en kick-boxing. « Ensemble, on va plus loin, on va plus haut. »', en: { role: 'Kickboxing · K1 · Savate · Lady Boxing · Kids and teens kickboxing', note: 'European and world runner-up in savate, semi-pro kickboxer. “Together we go further, we go higher.”' }, clubs: ['portet'], photo: require('@/assets/portraits/portet-samuel-pinto.jpg') },
  { id: 'enzo-pioppo', type: 'coach', nom: 'Enzo Pioppo', initiales: 'EP', role: 'Grappling · MMA', tag: 'Champion du monde', note: 'Ceinture noire de luta livre. Champion de France, vice-champion d’Europe, champion du Monde. La force tranquille.', en: { role: 'Grappling · MMA', tag: 'World champion', note: 'Luta livre black belt. French champion, European runner-up, world champion. Quiet strength.' }, clubs: ['portet'], photo: require('@/assets/portraits/portet-enzo-pioppo.jpg') },
  { id: 'nicolas-tramacon', type: 'coach', nom: 'Nicolas Tramaçon', initiales: 'NT', role: 'Grappling · MMA', note: 'BPJEPS sports de contact. Technicien rigoureux, compétiteur dans l’âme, sur le tatami comme dans la cage.', en: { role: 'Grappling · MMA', note: 'BPJEPS in contact sports. A rigorous technician and a competitor at heart, on the mats as in the cage.' }, clubs: ['portet'], photo: require('@/assets/portraits/portet-nicolas-tramacon.jpg') },
  { id: 'mourad-berraho', type: 'coach', nom: 'Mourad Berraho', initiales: 'MB', role: 'Boxe anglaise · Enfants et ados', note: 'Triple champion de France, membre de l’équipe de France, formé ici par Valentin Tapia. Avec Ingrid, il accompagne les enfants aux côtés de Valentin et Samuel.', en: { role: 'Boxing · Kids and teens', note: 'Three-time French champion and French national team member, trained here by Valentin Tapia. With Ingrid, he coaches the kids alongside Valentin and Samuel.' }, clubs: ['portet'], photo: require('@/assets/portraits/portet-mourad-berraho.jpg') },
  { id: 'ingrid', type: 'coach', nom: 'Ingrid', initiales: 'I', role: 'Kick-boxing · Enfants et ados', note: 'Avec Mourad, elle accompagne les enfants aux côtés de Valentin et Samuel : meilleurs dans le sport comme dans la vie.', en: { role: 'Kickboxing · Kids and teens', note: 'With Mourad, she coaches the kids alongside Valentin and Samuel: better in sport and in life.' }, clubs: ['portet'], photo: require('@/assets/portraits/portet-ingrid.jpg') },
  // Portet — la Team Tapia (page Boxeurs du site, galerie légendée)
  { id: 'anna-boullez', type: 'boxeur', nom: 'Anna Boullez', initiales: 'AB', role: 'Boxe anglaise · professionnelle', tag: 'Nº 1 française', note: 'Boxeuse professionnelle, classée nº 1 française dans sa catégorie, formée par Valentin Tapia. Elle encadre le stage des vacances avec lui.', en: { role: 'Boxing · professional', tag: 'French Nº 1', note: 'Professional boxer, ranked number one in France in her weight class, trained by Valentin Tapia. She runs the holiday camp with him.' }, clubs: ['portet'], photo: require('@/assets/portraits/portet-anna-boullez.jpg') },
  { id: 'pauline-re', type: 'boxeur', nom: 'Pauline Re', initiales: 'PR', role: 'Boxe anglaise · Team Tapia', en: { role: 'Boxing · Team Tapia' }, clubs: ['portet'], photo: require('@/assets/portraits/portet-pauline-re.jpg') },
  { id: 'marama-mercier', type: 'boxeur', nom: 'Marama Mercier', initiales: 'MM', role: 'Boxe anglaise · Team Tapia', en: { role: 'Boxing · Team Tapia' }, clubs: ['portet'], photo: require('@/assets/portraits/portet-marama-mercier.jpg') },
  { id: 'loyna-cagniac', type: 'boxeur', nom: 'Loyna Cagniac', initiales: 'LC', role: 'Boxe anglaise · Team Tapia', en: { role: 'Boxing · Team Tapia' }, clubs: ['portet'], photo: require('@/assets/portraits/portet-loyna-cagniac.jpg') },
  { id: 'anakine-lemberger', type: 'boxeur', nom: 'Anakine Lemberger', initiales: 'AL', role: 'Boxe anglaise · Team Tapia', en: { role: 'Boxing · Team Tapia' }, clubs: ['portet'], photo: require('@/assets/portraits/portet-anakine-lemberger.jpg') },
];

export function personnesDuClub(club: ClubId): Personne[] {
  return PERSONNES.filter((p) => p.clubs.includes(club));
}
