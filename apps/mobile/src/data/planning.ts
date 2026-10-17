/**
 * Plannings rentrée 2026 des cinq clubs, extraits de bc-plannings (src/data/plannings.js,
 * lui-même généré depuis les ODS de la direction). 188 créneaux. Généré le 2026-10-17.
 * jour : 0 = lundi … 6 = dimanche ; debut/fin en minutes depuis minuit.
 */
import type { ClubId } from '@/ui/theme';

export type Slot = {
  id: string;
  club: ClubId;
  espace?: string;
  jour: number;
  debut: number;
  fin: number;
  activite: string;
  coach?: string;
};

export const SLOTS: Slot[] = [
 {
  id: "rentree-501",
  club: "etats-unis",
  espace: "Boxe",
  jour: 0,
  debut: 760,
  fin: 800,
  activite: "BOXE PIEDS POINGS",
  coach: "RENAUD"
 },
 {
  id: "rentree-532",
  club: "etats-unis",
  espace: "Fitness",
  jour: 0,
  debut: 760,
  fin: 800,
  activite: "HYROX",
  coach: "CLEMENT"
 },
 {
  id: "rentree-660",
  club: "etats-unis",
  espace: "Fitness",
  jour: 0,
  debut: 800,
  fin: 1100,
  activite: "ACCES LIBRE",
  coach: "ACCES LIBRE"
 },
 {
  id: "rentree-522",
  club: "etats-unis",
  espace: "MMA",
  jour: 0,
  debut: 1100,
  fin: 1170,
  activite: "JIU-JITSU BRESILIEN",
  coach: "ZOUIR"
 },
 {
  id: "rentree-510",
  club: "etats-unis",
  espace: "Boxe",
  jour: 0,
  debut: 1110,
  fin: 1180,
  activite: "BOXE PIEDS POINGS",
  coach: "RENAUD"
 },
 {
  id: "rentree-536",
  club: "etats-unis",
  espace: "Fitness",
  jour: 0,
  debut: 1120,
  fin: 1160,
  activite: "HYROX",
  coach: "CLEMENT"
 },
 {
  id: "rentree-541",
  club: "etats-unis",
  espace: "Fitness",
  jour: 0,
  debut: 1170,
  fin: 1230,
  activite: "CROSS-TRAINING",
  coach: "YANNIS CHOUET"
 },
 {
  id: "rentree-526",
  club: "etats-unis",
  espace: "MMA",
  jour: 0,
  debut: 1180,
  fin: 1260,
  activite: "ASSO MMA",
  coach: "ZOUIR"
 },
 {
  id: "rentree-515",
  club: "etats-unis",
  espace: "Boxe",
  jour: 0,
  debut: 1190,
  fin: 1275,
  activite: "BOXE ANGLAISE",
  coach: "RENAUD"
 },
 {
  id: "rentree-502",
  club: "etats-unis",
  espace: "Boxe",
  jour: 1,
  debut: 760,
  fin: 800,
  activite: "BOXE ANGLAISE",
  coach: "RENAUD"
 },
 {
  id: "rentree-533",
  club: "etats-unis",
  espace: "Fitness",
  jour: 1,
  debut: 760,
  fin: 800,
  activite: "BOXING HIIT",
  coach: "CLEMENT"
 },
 {
  id: "rentree-523",
  club: "etats-unis",
  espace: "MMA",
  jour: 1,
  debut: 1100,
  fin: 1170,
  activite: "GRAPPLING",
  coach: "ZOUIR"
 },
 {
  id: "rentree-511",
  club: "etats-unis",
  espace: "Boxe",
  jour: 1,
  debut: 1110,
  fin: 1180,
  activite: "BOXE ANGLAISE",
  coach: "RENAUD"
 },
 {
  id: "rentree-537",
  club: "etats-unis",
  espace: "Fitness",
  jour: 1,
  debut: 1120,
  fin: 1160,
  activite: "LADY PUNCH",
  coach: "DAVID"
 },
 {
  id: "rentree-542",
  club: "etats-unis",
  espace: "Fitness",
  jour: 1,
  debut: 1170,
  fin: 1230,
  activite: "BOXING HIIT",
  coach: "CLEMENT"
 },
 {
  id: "rentree-527",
  club: "etats-unis",
  espace: "MMA",
  jour: 1,
  debut: 1180,
  fin: 1260,
  activite: "ASSO MMA",
  coach: "ZOUIR"
 },
 {
  id: "rentree-516",
  club: "etats-unis",
  espace: "Boxe",
  jour: 1,
  debut: 1190,
  fin: 1275,
  activite: "BOXE PIEDS POINGS",
  coach: "RENAUD"
 },
 {
  id: "rentree-503",
  club: "etats-unis",
  espace: "Boxe",
  jour: 2,
  debut: 760,
  fin: 800,
  activite: "BOXE PIEDS POINGS",
  coach: "RENAUD"
 },
 {
  id: "rentree-506",
  club: "etats-unis",
  espace: "Boxe",
  jour: 2,
  debut: 900,
  fin: 960,
  activite: "BOXE PIEDS POINGS 7/11 ANS"
 },
 {
  id: "rentree-508",
  club: "etats-unis",
  espace: "Boxe",
  jour: 2,
  debut: 960,
  fin: 1020,
  activite: "BOXE PIEDS POINGS 12/16 ANS"
 },
 {
  id: "rentree-520",
  club: "etats-unis",
  espace: "MMA",
  jour: 2,
  debut: 1080,
  fin: 1140,
  activite: "ASSO MMA ENFANTS 10/16 ANS"
 },
 {
  id: "rentree-512",
  club: "etats-unis",
  espace: "Boxe",
  jour: 2,
  debut: 1110,
  fin: 1180,
  activite: "BOXE PIEDS POINGS",
  coach: "RENAUD"
 },
 {
  id: "rentree-538",
  club: "etats-unis",
  espace: "Fitness",
  jour: 2,
  debut: 1120,
  fin: 1160,
  activite: "LADY PUNCH",
  coach: "CLEMENT"
 },
 {
  id: "rentree-543",
  club: "etats-unis",
  espace: "Fitness",
  jour: 2,
  debut: 1170,
  fin: 1230,
  activite: "CROSS-TRAINING",
  coach: "CLEMENT"
 },
 {
  id: "rentree-528",
  club: "etats-unis",
  espace: "MMA",
  jour: 2,
  debut: 1180,
  fin: 1260,
  activite: "JIU-JITSU BRESILIEN",
  coach: "ZOUIR"
 },
 {
  id: "rentree-517",
  club: "etats-unis",
  espace: "Boxe",
  jour: 2,
  debut: 1190,
  fin: 1275,
  activite: "BOXE ANGLAISE",
  coach: "RENAUD"
 },
 {
  id: "rentree-504",
  club: "etats-unis",
  espace: "Boxe",
  jour: 3,
  debut: 760,
  fin: 800,
  activite: "BOXE ANGLAISE",
  coach: "VALENTIN GUTH"
 },
 {
  id: "rentree-534",
  club: "etats-unis",
  espace: "Fitness",
  jour: 3,
  debut: 760,
  fin: 800,
  activite: "CROSS-TRAINING",
  coach: "CLEMENT"
 },
 {
  id: "rentree-524",
  club: "etats-unis",
  espace: "MMA",
  jour: 3,
  debut: 1100,
  fin: 1170,
  activite: "GRAPPLING",
  coach: "ZOUIR"
 },
 {
  id: "rentree-513",
  club: "etats-unis",
  espace: "Boxe",
  jour: 3,
  debut: 1110,
  fin: 1180,
  activite: "BOXE PIEDS POINGS",
  coach: "VALENTIN GUTH"
 },
 {
  id: "rentree-539",
  club: "etats-unis",
  espace: "Fitness",
  jour: 3,
  debut: 1120,
  fin: 1160,
  activite: "HYROX",
  coach: "YANNIS CHOUET"
 },
 {
  id: "rentree-544",
  club: "etats-unis",
  espace: "Fitness",
  jour: 3,
  debut: 1170,
  fin: 1230,
  activite: "BOXING HIIT",
  coach: "YANNIS CHOUET"
 },
 {
  id: "rentree-529",
  club: "etats-unis",
  espace: "MMA",
  jour: 3,
  debut: 1180,
  fin: 1260,
  activite: "ASSO MMA",
  coach: "ZOUIR"
 },
 {
  id: "rentree-518",
  club: "etats-unis",
  espace: "Boxe",
  jour: 3,
  debut: 1190,
  fin: 1275,
  activite: "BOXE ANGLAISE",
  coach: "RENAUD"
 },
 {
  id: "rentree-535",
  club: "etats-unis",
  espace: "Fitness",
  jour: 4,
  debut: 760,
  fin: 800,
  activite: "BOXING HIIT",
  coach: "CLEMENT"
 },
 {
  id: "rentree-525",
  club: "etats-unis",
  espace: "MMA",
  jour: 4,
  debut: 1100,
  fin: 1170,
  activite: "JIU-JITSU BRESILIEN",
  coach: "ZOUIR"
 },
 {
  id: "rentree-514",
  club: "etats-unis",
  espace: "Boxe",
  jour: 4,
  debut: 1110,
  fin: 1180,
  activite: "BOXE ANGLAISE",
  coach: "DAVID"
 },
 {
  id: "rentree-540",
  club: "etats-unis",
  espace: "Fitness",
  jour: 4,
  debut: 1120,
  fin: 1160,
  activite: "LADY PUNCH",
  coach: "VALENTIN GUTH"
 },
 {
  id: "rentree-545",
  club: "etats-unis",
  espace: "Fitness",
  jour: 4,
  debut: 1170,
  fin: 1230,
  activite: "BOXING HIIT",
  coach: "CLEMENT"
 },
 {
  id: "rentree-530",
  club: "etats-unis",
  espace: "MMA",
  jour: 4,
  debut: 1180,
  fin: 1260,
  activite: "ASSO MMA",
  coach: "ZOUIR"
 },
 {
  id: "rentree-519",
  club: "etats-unis",
  espace: "Boxe",
  jour: 4,
  debut: 1190,
  fin: 1275,
  activite: "BOXE PIEDS POINGS",
  coach: "RENAUD"
 },
 {
  id: "rentree-500",
  club: "etats-unis",
  espace: "Boxe",
  jour: 5,
  debut: 660,
  fin: 720,
  activite: "BOXE ANGLAISE"
 },
 {
  id: "rentree-531",
  club: "etats-unis",
  espace: "Fitness",
  jour: 5,
  debut: 660,
  fin: 720,
  activite: "CROSS-TRAINING"
 },
 {
  id: "rentree-505",
  club: "etats-unis",
  espace: "Boxe",
  jour: 5,
  debut: 855,
  fin: 900,
  activite: "BOXE PIEDS POINGS (3/6ANS)"
 },
 {
  id: "rentree-507",
  club: "etats-unis",
  espace: "Boxe",
  jour: 5,
  debut: 900,
  fin: 960,
  activite: "BOXE PIEDS POINGS 7/11 ANS"
 },
 {
  id: "rentree-509",
  club: "etats-unis",
  espace: "Boxe",
  jour: 5,
  debut: 960,
  fin: 1020,
  activite: "BOXE PIEDS POINGS 12/16 ANS"
 },
 {
  id: "rentree-521",
  club: "etats-unis",
  espace: "MMA",
  jour: 5,
  debut: 1080,
  fin: 1140,
  activite: "ASSO MMA ENFANTS 10/16 ANS"
 },
 {
  id: "min-1",
  club: "minimes",
  jour: 0,
  debut: 760,
  fin: 800,
  activite: "BOXING CAMP"
 },
 {
  id: "min-2",
  club: "minimes",
  jour: 0,
  debut: 1080,
  fin: 1170,
  activite: "BOXE COMPÉTITEURS",
  coach: "MEHDI B"
 },
 {
  id: "min-3",
  club: "minimes",
  jour: 0,
  debut: 1110,
  fin: 1170,
  activite: "BOXING LADY",
  coach: "CHLOE"
 },
 {
  id: "min-4",
  club: "minimes",
  jour: 0,
  debut: 1180,
  fin: 1260,
  activite: "BOXE ANGLAISE (LOISIRS)",
  coach: "MEHDI B"
 },
 {
  id: "min-5",
  club: "minimes",
  jour: 1,
  debut: 760,
  fin: 800,
  activite: "BOXE ANGLAISE (LOISIRS)",
  coach: "HICHAM"
 },
 {
  id: "min-6",
  club: "minimes",
  jour: 1,
  debut: 1080,
  fin: 1170,
  activite: "BOXE COMPÉTITEURS",
  coach: "MEHDI B"
 },
 {
  id: "min-7",
  club: "minimes",
  jour: 1,
  debut: 1110,
  fin: 1170,
  activite: "CROSS-TRAINING",
  coach: "HICHAM"
 },
 {
  id: "min-8",
  club: "minimes",
  jour: 1,
  debut: 1180,
  fin: 1260,
  activite: "BOXE ANGLAISE (LOISIRS)",
  coach: "MEHDI B"
 },
 {
  id: "min-9",
  club: "minimes",
  jour: 2,
  debut: 760,
  fin: 800,
  activite: "BOXE ANGLAISE (LOISIRS)",
  coach: "HICHAM"
 },
 {
  id: "min-10",
  club: "minimes",
  jour: 2,
  debut: 900,
  fin: 960,
  activite: "BOXE EDUCATIVE ENFANTS (7/11ANS)",
  coach: "MEHDI B"
 },
 {
  id: "min-11",
  club: "minimes",
  jour: 2,
  debut: 960,
  fin: 1020,
  activite: "BOXE EDUCATIVE ADOS (12/16ANS)",
  coach: "MEHDI B"
 },
 {
  id: "min-12",
  club: "minimes",
  jour: 2,
  debut: 1020,
  fin: 1110,
  activite: "BOXE EDUCATIVE COMPÉTITEURS",
  coach: "MEHDI B"
 },
 {
  id: "min-13",
  club: "minimes",
  jour: 2,
  debut: 1110,
  fin: 1170,
  activite: "BOXING LADY",
  coach: "DAVID"
 },
 {
  id: "min-14",
  club: "minimes",
  jour: 2,
  debut: 1180,
  fin: 1260,
  activite: "BOXE PIEDS POINGS",
  coach: "DAVID"
 },
 {
  id: "min-15",
  club: "minimes",
  jour: 3,
  debut: 760,
  fin: 800,
  activite: "BOXE ANGLAISE (LOISIRS)",
  coach: "HICHAM"
 },
 {
  id: "min-16",
  club: "minimes",
  jour: 3,
  debut: 1080,
  fin: 1170,
  activite: "BOXE COMPÉTITEURS",
  coach: "MEHDI B"
 },
 {
  id: "min-17",
  club: "minimes",
  jour: 3,
  debut: 1110,
  fin: 1170,
  activite: "CROSS-TRAINING",
  coach: "HICHAM"
 },
 {
  id: "min-18",
  club: "minimes",
  jour: 3,
  debut: 1180,
  fin: 1260,
  activite: "BOXE ANGLAISE (LOISIRS)",
  coach: "MEHDI B"
 },
 {
  id: "min-19",
  club: "minimes",
  jour: 4,
  debut: 760,
  fin: 800,
  activite: "BOXING CAMP"
 },
 {
  id: "min-20",
  club: "minimes",
  jour: 4,
  debut: 1080,
  fin: 1170,
  activite: "BOXE COMPÉTITEURS",
  coach: "MEHDI B"
 },
 {
  id: "min-21",
  club: "minimes",
  jour: 4,
  debut: 1180,
  fin: 1260,
  activite: "BOXE ANGLAISE (LOISIRS)",
  coach: "MEHDI B"
 },
 {
  id: "min-22",
  club: "minimes",
  jour: 5,
  debut: 660,
  fin: 720,
  activite: "BOXING CAMP"
 },
 {
  id: "min-23",
  club: "minimes",
  jour: 5,
  debut: 855,
  fin: 900,
  activite: "BABY BOXE (3/6ANS)",
  coach: "MEHDI B"
 },
 {
  id: "min-24",
  club: "minimes",
  jour: 5,
  debut: 900,
  fin: 960,
  activite: "BOXE EDUCATIVE ENFANTS (7/11ANS)",
  coach: "MEHDI B"
 },
 {
  id: "min-25",
  club: "minimes",
  jour: 5,
  debut: 960,
  fin: 1020,
  activite: "BOXE EDUCATIVE ADOS (12/16ANS)",
  coach: "MEHDI B"
 },
 {
  id: "min-26",
  club: "minimes",
  jour: 5,
  debut: 1020,
  fin: 1110,
  activite: "BOXE EDUCATIVE COMPÉTITEURS",
  coach: "MEHDI B"
 },
 {
  id: "min-27",
  club: "minimes",
  jour: 5,
  debut: 1110,
  fin: 1170,
  activite: "OPEN SPARRING",
  coach: "MEHDI B"
 },
 {
  id: "rentree-610",
  club: "portet",
  espace: "Combat",
  jour: 0,
  debut: 750,
  fin: 810,
  activite: "ANGLAISE",
  coach: "VAL"
 },
 {
  id: "rentree-620",
  club: "portet",
  espace: "Combat",
  jour: 0,
  debut: 1080,
  fin: 1140,
  activite: "BOXE EDUCATIVE CONFIRMES",
  coach: "MOURAD"
 },
 {
  id: "rentree-646",
  club: "portet",
  espace: "MMA",
  jour: 0,
  debut: 1080,
  fin: 1140,
  activite: "GRAPPLING",
  coach: "ENZO"
 },
 {
  id: "rentree-625",
  club: "portet",
  espace: "Combat",
  jour: 0,
  debut: 1140,
  fin: 1290,
  activite: "BOXE AMATEURS ET PROS",
  coach: "VAL"
 },
 {
  id: "rentree-651",
  club: "portet",
  espace: "MMA",
  jour: 0,
  debut: 1140,
  fin: 1200,
  activite: "MMA",
  coach: "ENZO"
 },
 {
  id: "rentree-611",
  club: "portet",
  espace: "Combat",
  jour: 1,
  debut: 750,
  fin: 810,
  activite: "PREPARATION PHYSIQUE",
  coach: "VAL"
 },
 {
  id: "rentree-636",
  club: "portet",
  espace: "MMA",
  jour: 1,
  debut: 750,
  fin: 810,
  activite: "MMA",
  coach: "NICOLAS"
 },
 {
  id: "rentree-621",
  club: "portet",
  espace: "Combat",
  jour: 1,
  debut: 1080,
  fin: 1140,
  activite: "BOXE AMATEURS ET PROS",
  coach: "VAL"
 },
 {
  id: "rentree-647",
  club: "portet",
  espace: "MMA",
  jour: 1,
  debut: 1080,
  fin: 1140,
  activite: "LADY KICK",
  coach: "SAMUEL"
 },
 {
  id: "rentree-626",
  club: "portet",
  espace: "Combat",
  jour: 1,
  debut: 1140,
  fin: 1200,
  activite: "PREPARATION PHYSIQUE",
  coach: "SAMUEL"
 },
 {
  id: "rentree-652",
  club: "portet",
  espace: "MMA",
  jour: 1,
  debut: 1140,
  fin: 1200,
  activite: "PREPARATION PHYSIQUE",
  coach: "SAMUEL"
 },
 {
  id: "rentree-628",
  club: "portet",
  espace: "Combat",
  jour: 1,
  debut: 1200,
  fin: 1290,
  activite: "ANGLAISE LOISIRS",
  coach: "VAL"
 },
 {
  id: "rentree-656",
  club: "portet",
  espace: "MMA",
  jour: 1,
  debut: 1200,
  fin: 1290,
  activite: "KICK BOXING / K1",
  coach: "SAMUEL"
 },
 {
  id: "rentree-637",
  club: "portet",
  espace: "MMA",
  jour: 2,
  debut: 750,
  fin: 810,
  activite: "KICK / K1",
  coach: "SAMUEL"
 },
 {
  id: "rentree-643",
  club: "portet",
  espace: "MMA",
  jour: 2,
  debut: 900,
  fin: 960,
  activite: "KICK ENFANTS",
  coach: "SAMUEL"
 },
 {
  id: "rentree-616",
  club: "portet",
  espace: "Combat",
  jour: 2,
  debut: 960,
  fin: 1020,
  activite: "BOXE EDUCATIVE 7/11ANS",
  coach: "MOURAD"
 },
 {
  id: "rentree-644",
  club: "portet",
  espace: "MMA",
  jour: 2,
  debut: 960,
  fin: 1020,
  activite: "KICK ADOS",
  coach: "SAMUEL"
 },
 {
  id: "rentree-618",
  club: "portet",
  espace: "Combat",
  jour: 2,
  debut: 1020,
  fin: 1080,
  activite: "BOXE EDUCATIVE 12/16ANS",
  coach: "MOURAD"
 },
 {
  id: "rentree-645",
  club: "portet",
  espace: "MMA",
  jour: 2,
  debut: 1020,
  fin: 1080,
  activite: "MMA ADOS",
  coach: "ENZO"
 },
 {
  id: "rentree-622",
  club: "portet",
  espace: "Combat",
  jour: 2,
  debut: 1080,
  fin: 1140,
  activite: "LADY BOXING",
  coach: "SAMUEL"
 },
 {
  id: "rentree-648",
  club: "portet",
  espace: "MMA",
  jour: 2,
  debut: 1080,
  fin: 1140,
  activite: "GRAPPLING",
  coach: "ENZO"
 },
 {
  id: "rentree-627",
  club: "portet",
  espace: "Combat",
  jour: 2,
  debut: 1140,
  fin: 1200,
  activite: "ANGLAISE LOISIRS",
  coach: "SAMUEL"
 },
 {
  id: "rentree-653",
  club: "portet",
  espace: "MMA",
  jour: 2,
  debut: 1140,
  fin: 1200,
  activite: "MMA",
  coach: "ENZO"
 },
 {
  id: "rentree-629",
  club: "portet",
  espace: "Combat",
  jour: 2,
  debut: 1200,
  fin: 1290,
  activite: "BOXE AMATEURS ET PROS",
  coach: "VAL"
 },
 {
  id: "rentree-657",
  club: "portet",
  espace: "MMA",
  jour: 2,
  debut: 1200,
  fin: 1290,
  activite: "KICK BOXING / K1",
  coach: "SAMUEL"
 },
 {
  id: "rentree-612",
  club: "portet",
  espace: "Combat",
  jour: 3,
  debut: 750,
  fin: 810,
  activite: "ANGLAISE",
  coach: "VAL"
 },
 {
  id: "rentree-638",
  club: "portet",
  espace: "MMA",
  jour: 3,
  debut: 750,
  fin: 810,
  activite: "GRAPPLING",
  coach: "NICOLAS"
 },
 {
  id: "rentree-623",
  club: "portet",
  espace: "Combat",
  jour: 3,
  debut: 1080,
  fin: 1200,
  activite: "BOXE AMATEURS ET PROS",
  coach: "VAL"
 },
 {
  id: "rentree-649",
  club: "portet",
  espace: "MMA",
  jour: 3,
  debut: 1080,
  fin: 1140,
  activite: "LADY KICK",
  coach: "SAMUEL"
 },
 {
  id: "rentree-654",
  club: "portet",
  espace: "MMA",
  jour: 3,
  debut: 1140,
  fin: 1200,
  activite: "BOXE FRANCAISE",
  coach: "SAMUEL"
 },
 {
  id: "rentree-630",
  club: "portet",
  espace: "Combat",
  jour: 3,
  debut: 1200,
  fin: 1290,
  activite: "ANGLAISE LOISIRS",
  coach: "VAL"
 },
 {
  id: "rentree-658",
  club: "portet",
  espace: "MMA",
  jour: 3,
  debut: 1200,
  fin: 1290,
  activite: "KICK BOXING / K1",
  coach: "SAMUEL"
 },
 {
  id: "rentree-613",
  club: "portet",
  espace: "Combat",
  jour: 4,
  debut: 750,
  fin: 810,
  activite: "ANGLAISE",
  coach: "VAL"
 },
 {
  id: "rentree-639",
  club: "portet",
  espace: "MMA",
  jour: 4,
  debut: 750,
  fin: 810,
  activite: "KICK / K1",
  coach: "SAMUEL"
 },
 {
  id: "rentree-624",
  club: "portet",
  espace: "Combat",
  jour: 4,
  debut: 1080,
  fin: 1200,
  activite: "BOXE AMATEURS ET PROS",
  coach: "VAL"
 },
 {
  id: "rentree-650",
  club: "portet",
  espace: "MMA",
  jour: 4,
  debut: 1080,
  fin: 1140,
  activite: "GRAPPLING",
  coach: "ENZO"
 },
 {
  id: "rentree-655",
  club: "portet",
  espace: "MMA",
  jour: 4,
  debut: 1140,
  fin: 1200,
  activite: "MMA",
  coach: "ENZO"
 },
 {
  id: "rentree-631",
  club: "portet",
  espace: "Combat",
  jour: 4,
  debut: 1200,
  fin: 1290,
  activite: "OPEN SPARRING"
 },
 {
  id: "rentree-659",
  club: "portet",
  espace: "MMA",
  jour: 4,
  debut: 1200,
  fin: 1290,
  activite: "OPEN SPARRING"
 },
 {
  id: "rentree-609",
  club: "portet",
  espace: "Combat",
  jour: 5,
  debut: 600,
  fin: 720,
  activite: "BOXE AMATEURS ET PROS",
  coach: "VAL"
 },
 {
  id: "rentree-632",
  club: "portet",
  espace: "MMA",
  jour: 5,
  debut: 600,
  fin: 690,
  activite: "BOXE FRANCAISE",
  coach: "SAMUEL"
 },
 {
  id: "rentree-633",
  club: "portet",
  espace: "MMA",
  jour: 5,
  debut: 600,
  fin: 690,
  activite: "KICK ENFANTS",
  coach: "INGRID"
 },
 {
  id: "rentree-634",
  club: "portet",
  espace: "MMA",
  jour: 5,
  debut: 690,
  fin: 750,
  activite: "PREPARATION PHYSIQUE",
  coach: "SAMUEL"
 },
 {
  id: "rentree-635",
  club: "portet",
  espace: "MMA",
  jour: 5,
  debut: 690,
  fin: 750,
  activite: "KICK ADOS",
  coach: "INGRID"
 },
 {
  id: "rentree-614",
  club: "portet",
  espace: "Combat",
  jour: 5,
  debut: 750,
  fin: 810,
  activite: "ANGLAISE",
  coach: "VAL"
 },
 {
  id: "rentree-640",
  club: "portet",
  espace: "MMA",
  jour: 5,
  debut: 750,
  fin: 810,
  activite: "MMA",
  coach: "ENZO"
 },
 {
  id: "rentree-641",
  club: "portet",
  espace: "MMA",
  jour: 5,
  debut: 840,
  fin: 900,
  activite: "GRAPPLING",
  coach: "ENZO"
 },
 {
  id: "rentree-642",
  club: "portet",
  espace: "MMA",
  jour: 5,
  debut: 900,
  fin: 960,
  activite: "MMA ADOS",
  coach: "ENZO"
 },
 {
  id: "rentree-615",
  club: "portet",
  espace: "Combat",
  jour: 5,
  debut: 915,
  fin: 960,
  activite: "BABY BOXE (3/6ANS)",
  coach: "MOURAD"
 },
 {
  id: "rentree-617",
  club: "portet",
  espace: "Combat",
  jour: 5,
  debut: 960,
  fin: 1020,
  activite: "BOXE EDUCATIVE 7/11ANS",
  coach: "MOURAD"
 },
 {
  id: "rentree-619",
  club: "portet",
  espace: "Combat",
  jour: 5,
  debut: 1020,
  fin: 1080,
  activite: "BOXE EDUCATIVE 12/16ANS",
  coach: "MOURAD"
 },
 {
  id: "rentree-547",
  club: "ramonville",
  jour: 0,
  debut: 760,
  fin: 800,
  activite: "BOXING CAMP",
  coach: "SONIA"
 },
 {
  id: "rentree-557",
  club: "ramonville",
  jour: 0,
  debut: 1080,
  fin: 1120,
  activite: "LADY PUNCH",
  coach: "SONIA"
 },
 {
  id: "rentree-559",
  club: "ramonville",
  jour: 0,
  debut: 1120,
  fin: 1180,
  activite: "BOXE PIEDS POINGS",
  coach: "SONIA"
 },
 {
  id: "rentree-564",
  club: "ramonville",
  jour: 0,
  debut: 1185,
  fin: 1275,
  activite: "ANGLAISE LOISIRS",
  coach: "VALENTIN G"
 },
 {
  id: "rentree-548",
  club: "ramonville",
  jour: 1,
  debut: 760,
  fin: 800,
  activite: "ANGLAISE",
  coach: "VALENTIN G"
 },
 {
  id: "rentree-560",
  club: "ramonville",
  jour: 1,
  debut: 1120,
  fin: 1180,
  activite: "GRAPPLING",
  coach: "JEROME"
 },
 {
  id: "rentree-565",
  club: "ramonville",
  jour: 1,
  debut: 1185,
  fin: 1275,
  activite: "ASSO MMA",
  coach: "JEROME"
 },
 {
  id: "rentree-549",
  club: "ramonville",
  jour: 2,
  debut: 760,
  fin: 800,
  activite: "BOXING CAMP",
  coach: "FAROUK"
 },
 {
  id: "rentree-553",
  club: "ramonville",
  jour: 2,
  debut: 900,
  fin: 960,
  activite: "BOXE EDUCATIVE 7/11 ANS",
  coach: "VALENTIN G"
 },
 {
  id: "rentree-555",
  club: "ramonville",
  jour: 2,
  debut: 960,
  fin: 1020,
  activite: "BOXE EDUCATIVE 12/16 ANS",
  coach: "VALENTIN G"
 },
 {
  id: "rentree-561",
  club: "ramonville",
  jour: 2,
  debut: 1120,
  fin: 1180,
  activite: "BOXE ANGLAISE 18H45/20H15"
 },
 {
  id: "rentree-550",
  club: "ramonville",
  jour: 3,
  debut: 760,
  fin: 800,
  activite: "BOXE PIEDS POINGS",
  coach: "SONIA"
 },
 {
  id: "rentree-562",
  club: "ramonville",
  jour: 3,
  debut: 1120,
  fin: 1180,
  activite: "BOXING CAMP",
  coach: "SONIA"
 },
 {
  id: "rentree-566",
  club: "ramonville",
  jour: 3,
  debut: 1185,
  fin: 1275,
  activite: "ASSO MMA",
  coach: "JEROME"
 },
 {
  id: "rentree-551",
  club: "ramonville",
  jour: 4,
  debut: 760,
  fin: 800,
  activite: "ANGLAISE",
  coach: "VALENTIN G"
 },
 {
  id: "rentree-558",
  club: "ramonville",
  jour: 4,
  debut: 1080,
  fin: 1120,
  activite: "LADY PUNCH",
  coach: "VALENTIN G"
 },
 {
  id: "rentree-563",
  club: "ramonville",
  jour: 4,
  debut: 1120,
  fin: 1180,
  activite: "BOXE PIEDS POINGS",
  coach: "SONIA"
 },
 {
  id: "rentree-567",
  club: "ramonville",
  jour: 4,
  debut: 1185,
  fin: 1275,
  activite: "ANGLAISE LOISIRS",
  coach: "FAROUK"
 },
 {
  id: "rentree-546",
  club: "ramonville",
  jour: 5,
  debut: 660,
  fin: 720,
  activite: "BOXING CAMP"
 },
 {
  id: "rentree-552",
  club: "ramonville",
  jour: 5,
  debut: 855,
  fin: 900,
  activite: "BABY BOXE (3/6ANS)"
 },
 {
  id: "rentree-554",
  club: "ramonville",
  jour: 5,
  debut: 900,
  fin: 960,
  activite: "BOXE EDUCATIVE 7/11 ANS"
 },
 {
  id: "rentree-556",
  club: "ramonville",
  jour: 5,
  debut: 960,
  fin: 1020,
  activite: "BOXE EDUCATIVE 12/16 ANS"
 },
 {
  id: "rentree-568",
  club: "saint-cyprien",
  jour: 0,
  debut: 600,
  fin: 720,
  activite: "ACCES LIBRE",
  coach: "ACCES LIBRE"
 },
 {
  id: "rentree-575",
  club: "saint-cyprien",
  jour: 0,
  debut: 760,
  fin: 800,
  activite: "BOXING CAMP",
  coach: "DADI"
 },
 {
  id: "rentree-581",
  club: "saint-cyprien",
  jour: 0,
  debut: 855,
  fin: 1095,
  activite: "ACCES LIBRE",
  coach: "ACCES LIBRE"
 },
 {
  id: "rentree-593",
  club: "saint-cyprien",
  jour: 0,
  debut: 1100,
  fin: 1140,
  activite: "BOXING CAMP",
  coach: "DADI"
 },
 {
  id: "rentree-599",
  club: "saint-cyprien",
  jour: 0,
  debut: 1140,
  fin: 1200,
  activite: "CROSS-TRAINING",
  coach: "HICHAM"
 },
 {
  id: "rentree-604",
  club: "saint-cyprien",
  jour: 0,
  debut: 1200,
  fin: 1275,
  activite: "ANGLAISE",
  coach: "DADI"
 },
 {
  id: "rentree-569",
  club: "saint-cyprien",
  jour: 1,
  debut: 600,
  fin: 720,
  activite: "ACCES LIBRE",
  coach: "ACCES LIBRE"
 },
 {
  id: "rentree-576",
  club: "saint-cyprien",
  jour: 1,
  debut: 760,
  fin: 800,
  activite: "BOXE THAI/ K1",
  coach: "TAWEE"
 },
 {
  id: "rentree-582",
  club: "saint-cyprien",
  jour: 1,
  debut: 855,
  fin: 1095,
  activite: "ACCES LIBRE",
  coach: "ACCES LIBRE"
 },
 {
  id: "rentree-594",
  club: "saint-cyprien",
  jour: 1,
  debut: 1100,
  fin: 1140,
  activite: "LADY PUNCH",
  coach: "DADI"
 },
 {
  id: "rentree-600",
  club: "saint-cyprien",
  jour: 1,
  debut: 1140,
  fin: 1200,
  activite: "GRAPPLING"
 },
 {
  id: "rentree-605",
  club: "saint-cyprien",
  jour: 1,
  debut: 1200,
  fin: 1275,
  activite: "BOXE THAI/ K1",
  coach: "TAWEE"
 },
 {
  id: "rentree-570",
  club: "saint-cyprien",
  jour: 2,
  debut: 600,
  fin: 720,
  activite: "ACCES LIBRE",
  coach: "ACCES LIBRE"
 },
 {
  id: "rentree-577",
  club: "saint-cyprien",
  jour: 2,
  debut: 760,
  fin: 800,
  activite: "ANGLAISE",
  coach: "DADI"
 },
 {
  id: "rentree-585",
  club: "saint-cyprien",
  jour: 2,
  debut: 855,
  fin: 900,
  activite: "ACCES LIBRE",
  coach: "ACCES LIBRE"
 },
 {
  id: "rentree-587",
  club: "saint-cyprien",
  jour: 2,
  debut: 900,
  fin: 960,
  activite: "BOXE EDUCATIVE 7/11 ANS",
  coach: "DADI"
 },
 {
  id: "rentree-589",
  club: "saint-cyprien",
  jour: 2,
  debut: 960,
  fin: 1020,
  activite: "BOXE EDUCATIVE 12/16 ANS",
  coach: "DADI"
 },
 {
  id: "rentree-591",
  club: "saint-cyprien",
  jour: 2,
  debut: 1020,
  fin: 1095,
  activite: "BOXE EDUCATIVE COMPÉTITEURS",
  coach: "DADI"
 },
 {
  id: "rentree-595",
  club: "saint-cyprien",
  jour: 2,
  debut: 1100,
  fin: 1140,
  activite: "HYROX",
  coach: "HICHAM"
 },
 {
  id: "rentree-601",
  club: "saint-cyprien",
  jour: 2,
  debut: 1140,
  fin: 1200,
  activite: "CROSS-TRAINING",
  coach: "HICHAM"
 },
 {
  id: "rentree-606",
  club: "saint-cyprien",
  jour: 2,
  debut: 1200,
  fin: 1275,
  activite: "ANGLAISE",
  coach: "DADI"
 },
 {
  id: "rentree-571",
  club: "saint-cyprien",
  jour: 3,
  debut: 600,
  fin: 720,
  activite: "ACCES LIBRE",
  coach: "ACCES LIBRE"
 },
 {
  id: "rentree-578",
  club: "saint-cyprien",
  jour: 3,
  debut: 760,
  fin: 800,
  activite: "BOXE THAI/ K1",
  coach: "TAWEE"
 },
 {
  id: "rentree-583",
  club: "saint-cyprien",
  jour: 3,
  debut: 855,
  fin: 1095,
  activite: "ACCES LIBRE",
  coach: "ACCES LIBRE"
 },
 {
  id: "rentree-596",
  club: "saint-cyprien",
  jour: 3,
  debut: 1100,
  fin: 1140,
  activite: "LADY PUNCH",
  coach: "DADI"
 },
 {
  id: "rentree-602",
  club: "saint-cyprien",
  jour: 3,
  debut: 1140,
  fin: 1200,
  activite: "GRAPPLING"
 },
 {
  id: "rentree-607",
  club: "saint-cyprien",
  jour: 3,
  debut: 1200,
  fin: 1275,
  activite: "BOXE THAI/ K1",
  coach: "TAWEE"
 },
 {
  id: "rentree-572",
  club: "saint-cyprien",
  jour: 4,
  debut: 600,
  fin: 720,
  activite: "ACCES LIBRE",
  coach: "ACCES LIBRE"
 },
 {
  id: "rentree-579",
  club: "saint-cyprien",
  jour: 4,
  debut: 760,
  fin: 800,
  activite: "ANGLAISE",
  coach: "DADI"
 },
 {
  id: "rentree-584",
  club: "saint-cyprien",
  jour: 4,
  debut: 855,
  fin: 1095,
  activite: "ACCES LIBRE",
  coach: "ACCES LIBRE"
 },
 {
  id: "rentree-597",
  club: "saint-cyprien",
  jour: 4,
  debut: 1100,
  fin: 1140,
  activite: "BOXING CAMP",
  coach: "DADI"
 },
 {
  id: "rentree-603",
  club: "saint-cyprien",
  jour: 4,
  debut: 1140,
  fin: 1200,
  activite: "BOXE THAI/ K1",
  coach: "VICTOR G"
 },
 {
  id: "rentree-608",
  club: "saint-cyprien",
  jour: 4,
  debut: 1200,
  fin: 1275,
  activite: "BOXE ANGLAISE",
  coach: "DADI"
 },
 {
  id: "rentree-573",
  club: "saint-cyprien",
  jour: 5,
  debut: 600,
  fin: 660,
  activite: "ACCES LIBRE",
  coach: "ACCES LIBRE"
 },
 {
  id: "rentree-574",
  club: "saint-cyprien",
  jour: 5,
  debut: 660,
  fin: 720,
  activite: "BOXING CAMP",
  coach: "HICHAM"
 },
 {
  id: "rentree-580",
  club: "saint-cyprien",
  jour: 5,
  debut: 760,
  fin: 800,
  activite: "ACCES LIBRE",
  coach: "ACCES LIBRE"
 },
 {
  id: "rentree-586",
  club: "saint-cyprien",
  jour: 5,
  debut: 855,
  fin: 900,
  activite: "BABY BOXE (3/6ANS)",
  coach: "DADI"
 },
 {
  id: "rentree-588",
  club: "saint-cyprien",
  jour: 5,
  debut: 900,
  fin: 960,
  activite: "BOXE EDUCATIVE 7/11 ANS",
  coach: "DADI"
 },
 {
  id: "rentree-590",
  club: "saint-cyprien",
  jour: 5,
  debut: 960,
  fin: 1020,
  activite: "BOXE EDUCATIVE 12/16 ANS",
  coach: "DADI"
 },
 {
  id: "rentree-592",
  club: "saint-cyprien",
  jour: 5,
  debut: 1020,
  fin: 1095,
  activite: "BOXE EDUCATIVE COMPÉTITEURS",
  coach: "DADI"
 },
 {
  id: "rentree-598",
  club: "saint-cyprien",
  jour: 5,
  debut: 1100,
  fin: 1200,
  activite: "BOXE THAI/ K1 18H/20H"
 }
];

export const ACTIVITES = ["ACCES LIBRE","ANGLAISE","ANGLAISE LOISIRS","ASSO MMA","ASSO MMA ENFANTS 10/16 ANS","BABY BOXE (3/6ANS)","BOXE AMATEURS ET PROS","BOXE ANGLAISE","BOXE ANGLAISE (LOISIRS)","BOXE ANGLAISE 18H45/20H15","BOXE COMPÉTITEURS","BOXE EDUCATIVE 12/16 ANS","BOXE EDUCATIVE 12/16ANS","BOXE EDUCATIVE 7/11 ANS","BOXE EDUCATIVE 7/11ANS","BOXE EDUCATIVE ADOS (12/16ANS)","BOXE EDUCATIVE COMPÉTITEURS","BOXE EDUCATIVE CONFIRMES","BOXE EDUCATIVE ENFANTS (7/11ANS)","BOXE FRANCAISE","BOXE PIEDS POINGS","BOXE PIEDS POINGS (3/6ANS)","BOXE PIEDS POINGS 12/16 ANS","BOXE PIEDS POINGS 7/11 ANS","BOXE THAI/ K1","BOXE THAI/ K1 18H/20H","BOXING CAMP","BOXING HIIT","BOXING LADY","CROSS-TRAINING","GRAPPLING","HYROX","JIU-JITSU BRESILIEN","KICK / K1","KICK ADOS","KICK BOXING / K1","KICK ENFANTS","LADY BOXING","LADY KICK","LADY PUNCH","MMA","MMA ADOS","OPEN SPARRING","PREPARATION PHYSIQUE"] as const;
