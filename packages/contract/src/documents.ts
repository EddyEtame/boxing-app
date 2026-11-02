/**
 * Les documents signés à la souscription, rangés dans « Mon abonnement ».
 * Côté boutique (vérifié le 02/11/2026) : à l'étape de signature, les conditions
 * générales, le règlement intérieur et la déclaration de santé, que le dossier
 * d'inscription signé réunit ; il n'y a pas de « contrat » à part (le `contract_pdf`
 * d'une commande est sa facture). Côté Deciplus : le mandat SEPA. Une inscription
 * faite à l'accueil ne laisse rien dans la boutique. L'autorisation parentale n'existe
 * pas encore comme document : le type la prévoit pour le jour où le club la dématérialise.
 */
export type SignedDocumentKind = 'dossier' | 'cgv' | 'reglement' | 'sante' | 'mandat_sepa' | 'autorisation_parentale';

export type SignedDocumentRef = {
  id: string;
  kind: SignedDocumentKind;
  /** ISO 8601 : la date de la signature, affichée à l'adhérent. */
  signedAt: string;
  /** Lien temporaire vers le PDF, réservé à l'adhérent (la déclaration de santé est une donnée sensible). */
  url: string;
};

export type SignedDocumentsResponse = {
  items: SignedDocumentRef[];
};
