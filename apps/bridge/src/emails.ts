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

const INTROS: Record<string, string> = {
  signup: 'Voici le code pour confirmer ton compte sur l’application Boxing Center.',
  recovery: 'Voici le code pour choisir un nouveau mot de passe sur l’application Boxing Center.',
  email_change: 'Voici le code pour confirmer ta nouvelle adresse e-mail.',
  reauthentication: 'Voici le code pour confirmer qu’il s’agit bien de toi.',
  magiclink: 'Voici le code pour te connecter à l’application Boxing Center.',
  invite: 'Voici le code pour accepter ton invitation Boxing Center.',
};

export function buildAuthEmail(input: { action: string; prenom: string | null; code: string }): { subject: string; text: string; html: string } {
  const prenom = cleanPrenom(input.prenom);
  const hello = prenom ? `Bonjour ${prenom},` : 'Bonjour,';
  const intro = INTROS[input.action] ?? INTROS.magiclink;
  const code = input.code.trim();
  const subject = `Boxing Center : ${code}`;
  const text = [
    hello,
    '',
    intro ?? '',
    '',
    code,
    '',
    'Valable 1 heure. Un seul usage.',
    '',
    'Si tu n’as pas demandé ce code, ignore ce message.',
    '',
    'Boxing Center',
  ].join('\n');
  const html = [
    '<!DOCTYPE html>',
    '<html lang="fr">',
    '<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>',
    '<body style="margin:0;padding:24px;font-family:Arial,Helvetica,sans-serif;font-size:16px;color:#111111;background:#ffffff;">',
    `<p>${escapeHtml(hello)}</p>`,
    `<p>${escapeHtml(intro ?? '')}</p>`,
    `<p style="font-size:28px;font-weight:bold;letter-spacing:4px;color:#111111;">${escapeHtml(code)}</p>`,
    '<p>Valable 1 heure. Un seul usage.</p>',
    '<p>Si tu n’as pas demandé ce code, ignore ce message.</p>',
    '<p>Boxing Center</p>',
    '</body>',
    '</html>',
  ].join('');
  return { subject, text, html };
}
