import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

function nomPdf(nom: string): string {
  const propre = nom.replace(/[^\w.-]/g, '_') || 'document';
  return propre.toLowerCase().endsWith('.pdf') ? propre : `${propre}.pdf`;
}

/** Enregistre un PDF dans le dossier de l'app (aucun acces au stockage partage). */
export async function enregistrerPdf(nom: string, contenu: Uint8Array): Promise<string> {
  const fichier = new File(Paths.document, nomPdf(nom));
  fichier.create({ overwrite: true });
  await fichier.write(contenu);
  return fichier.uri;
}

/** Ouvre le PDF (apercu systeme, sinon feuille de partage). */
export async function ouvrirPdf(uri: string): Promise<boolean> {
  const fichier = new File(uri);
  if (Platform.OS !== 'web') {
    try {
      if (await fichier.canPreview({ mimeType: 'application/pdf' })) {
        await fichier.preview();
        return true;
      }
    } catch {
      // L'apercu n'est pas disponible : on propose le partage.
    }
  }
  if (!(await Sharing.isAvailableAsync())) return false;
  await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: 'Facture' });
  return true;
}
