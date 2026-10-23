import { DEFAULT_DEMO, generatePassages, type Passage } from '@bc/contract';

import type { ClubId } from '@/ui/theme';

/**
 * Adhérent de démonstration. Toutes les valeurs ont la forme exacte de ce que le
 * connecteur Deciplus renverra ; rien ici n’est branché sur le réel. À remplacer
 * par le store de session dès que le connecteur lit la fiche Deciplus.
 */
export type MemberStatus = 'actif' | 'restreint' | 'invite';

export type Member = {
  prenom: string;
  nom: string;
  dateNaissance: string;
  statut: MemberStatus;
  clubPrincipal: ClubId;
  deciplusId: string;
  abonnement: {
    libelle: string;
    type: 'prelevement' | 'comptant';
    debut: string;
    fin?: string;
    prochainPrelevement?: string;
    montant: number;
    impaye: number;
  };
  badge: {
    enregistre: boolean;
    numero: string;
  };
  passages: Passage[];
};

export const MEMBER: Member = {
  prenom: 'Camille',
  nom: 'Durand',
  dateNaissance: '1996-04-12',
  statut: 'actif',
  clubPrincipal: 'minimes',
  deciplusId: '48213',
  abonnement: {
    libelle: 'Sans engagement · 4 semaines',
    type: 'prelevement',
    debut: '2026-09-07',
    prochainPrelevement: '2026-10-24',
    montant: 44.99,
    impaye: 0,
  },
  badge: {
    enregistre: true,
    numero: '0048213',
  },
  // 26 semaines fabriquées par le générateur partagé avec l’admin (même graine, même historique).
  passages: generatePassages(DEFAULT_DEMO),
};

/** Une facture : une période d’abonnement (mise en forme à l’affichage, dans la langue de l’app) ou un achat. */
export type Invoice = { numero: string; date: string; montant: number; origine: 'Deciplus' | 'Boutique' } & ({ du: string; au: string } | { objet: 'badge' });

export const INVOICES: Invoice[] = [
  { numero: 'F-2026-10-0412', date: '2026-10-03', du: '2026-09-26', au: '2026-10-23', montant: 44.99, origine: 'Deciplus' },
  { numero: 'F-2026-09-0391', date: '2026-09-05', du: '2026-08-29', au: '2026-09-25', montant: 44.99, origine: 'Deciplus' },
  { numero: 'B-2026-09-0077', date: '2026-09-07', objet: 'badge', montant: 34.99, origine: 'Boutique' },
  { numero: 'F-2026-08-0352', date: '2026-08-08', du: '2026-08-01', au: '2026-08-28', montant: 44.99, origine: 'Deciplus' },
];

/** Les libellés du catalogue Deciplus en anglais ; le connecteur renverra le libellé français. */
const LIBELLES_EN: Record<string, string> = { 'Sans engagement': 'No commitment', '4 semaines': '4 weeks' };

export function libelleIn(libelle: string, lang: 'fr' | 'en'): string {
  return lang === 'en' ? libelle.split(' · ').map((p) => LIBELLES_EN[p] ?? p).join(' · ') : libelle;
}

export function ageOf(member: Member, now = new Date()): number {
  const d = new Date(member.dateNaissance + 'T00:00:00');
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age;
}
