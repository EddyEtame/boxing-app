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

const INTROS: Record<'fr' | 'en', Record<string, string>> = {
  fr: {
    signup: 'Voici le code pour confirmer ton compte sur l’application Boxing Center.',
    recovery: 'Voici le code pour choisir un nouveau mot de passe sur l’application Boxing Center.',
    email_change: 'Voici le code pour confirmer ta nouvelle adresse e-mail.',
    reauthentication: 'Voici le code pour confirmer qu’il s’agit bien de toi.',
    magiclink: 'Voici le code pour te connecter à l’application Boxing Center.',
    invite: 'Voici le code pour accepter ton invitation Boxing Center.',
  },
  en: {
    signup: 'Here is the code to confirm your account on the Boxing Center app.',
    recovery: 'Here is the code to choose a new password on the Boxing Center app.',
    email_change: 'Here is the code to confirm your new email address.',
    reauthentication: 'Here is the code to confirm it is really you.',
    magiclink: 'Here is the code to sign in to the Boxing Center app.',
    invite: 'Here is the code to accept your Boxing Center invitation.',
  },
};

const TEXTES = {
  fr: { hello: (p: string | null) => (p ? `Bonjour ${p},` : 'Bonjour,'), valid: 'Valable 1 heure. Un seul usage.', ignore: 'Si tu n’as pas demandé ce code, ignore ce message.' },
  en: { hello: (p: string | null) => (p ? `Hi ${p},` : 'Hi,'), valid: 'Valid for 1 hour. Single use.', ignore: 'If you did not ask for this code, ignore this message.' },
};

export function buildAuthEmail(input: { action: string; prenom: string | null; code: string; langue?: string | null }): { subject: string; text: string; html: string } {
  const langue: 'fr' | 'en' = input.langue === 'en' ? 'en' : 'fr';
  const mots = TEXTES[langue];
  const prenom = cleanPrenom(input.prenom);
  const hello = mots.hello(prenom);
  const intro = INTROS[langue][input.action] ?? INTROS[langue].magiclink;
  const code = input.code.trim();
  const subject = `Boxing Center : ${code}`;
  const text = [hello, '', intro ?? '', '', code, '', mots.valid, '', mots.ignore, '', 'Boxing Center'].join('\n');
  const html = [
    '<!DOCTYPE html>',
    `<html lang="${langue}">`,
    '<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>',
    '<body style="margin:0;padding:24px;font-family:Arial,Helvetica,sans-serif;font-size:16px;color:#111111;background:#ffffff;">',
    `<p>${escapeHtml(hello)}</p>`,
    `<p>${escapeHtml(intro ?? '')}</p>`,
    `<p style="font-size:28px;font-weight:bold;letter-spacing:4px;color:#111111;">${escapeHtml(code)}</p>`,
    `<p>${escapeHtml(mots.valid)}</p>`,
    `<p>${escapeHtml(mots.ignore)}</p>`,
    '<p>Boxing Center</p>',
    '</body>',
    '</html>',
  ].join('');
  return { subject, text, html };
}
