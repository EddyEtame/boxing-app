function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function cleanPrenom(value: string | null): string | null {
  if (!value) return null;
  const cleaned = value.replace(/[\u0000-\u001f]+/g, ' ').trim().slice(0, 80);
  return cleaned || null;
}

const SUBJECTS: Record<string, string> = {
  signup: 'Verifiez votre adresse e-mail',
  recovery: 'Reinitialisation du mot de passe',
  email_change: 'Confirmez votre nouvelle adresse',
  reauthentication: 'Confirmez votre identite',
  magiclink: 'Votre code de connexion',
  invite: 'Votre invitation Boxing Center',
};

const INTROS: Record<string, string> = {
  signup: 'Utilisez ce code pour verifier votre adresse e-mail.',
  recovery: 'Utilisez ce code pour choisir un nouveau mot de passe.',
  email_change: 'Utilisez ce code pour confirmer votre nouvelle adresse e-mail.',
  reauthentication: 'Utilisez ce code pour confirmer qu\'il s\'agit bien de vous.',
  magiclink: 'Utilisez ce code pour vous connecter.',
  invite: 'Utilisez ce code pour accepter votre invitation.',
};

export function buildAuthEmail(input: { action: string; prenom: string | null; code: string }): { subject: string; text: string; html: string } {
  const prenom = cleanPrenom(input.prenom);
  const hello = prenom ? `Bonjour ${prenom},` : 'Bonjour,';
  const intro = INTROS[input.action] ?? INTROS.magiclink;
  const subject = SUBJECTS[input.action] ?? SUBJECTS.magiclink;
  const text = [
    hello,
    '',
    intro ?? '',
    '',
    `Code : ${input.code}`,
    '',
    'Ce code est valable 1 heure.',
    '',
    'Si vous n\'etes pas a l\'origine de cette demande, ignorez ce message.',
    '',
    'Boxing Center',
  ].join('\n');
  const html = [
    '<!DOCTYPE html>',
    '<html lang="fr">',
    '<body style="font-family: Arial, sans-serif; color: #20254B; line-height: 1.5;">',
    `<p>${escapeHtml(hello)}</p>`,
    `<p>${escapeHtml(intro ?? '')}</p>`,
    `<p style="font-size: 28px; letter-spacing: 6px; font-weight: bold;">${escapeHtml(input.code)}</p>`,
    '<p>Ce code est valable 1 heure.</p>',
    '<p>Si vous n\'etes pas a l\'origine de cette demande, ignorez ce message.</p>',
    '<p>Boxing Center</p>',
    '</body>',
    '</html>',
  ].join('');
  return { subject: subject ?? 'Votre code Boxing Center', text, html };
}
