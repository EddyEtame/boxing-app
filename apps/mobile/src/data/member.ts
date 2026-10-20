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

export const INVOICES = [
  { numero: 'F-2026-10-0412', date: '2026-10-03', periode: '26 sept. → 23 oct. 2026', montant: 44.99, origine: 'Deciplus' },
  { numero: 'F-2026-09-0391', date: '2026-09-05', periode: '29 août → 25 sept. 2026', montant: 44.99, origine: 'Deciplus' },
  { numero: 'B-2026-09-0077', date: '2026-09-07', periode: 'Badge d’accès', montant: 34.99, origine: 'Boutique' },
  { numero: 'F-2026-08-0352', date: '2026-08-08', periode: '1er → 28 août 2026', montant: 44.99, origine: 'Deciplus' },
] as const;

export function ageOf(member: Member, now = new Date()): number {
  const d = new Date(member.dateNaissance + 'T00:00:00');
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age;
}
