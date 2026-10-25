import type { Env } from './env.ts';

export type OutboundMail = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

export type Mailer = {
  send(mail: OutboundMail): Promise<void>;
};

type FetchLike = typeof fetch;

export function createMailer(env: Env, fetchImpl: FetchLike = fetch): Mailer {
  return {
    async send(mail) {
      let response: Response;
      try {
        response = await fetchImpl('https://api.brevo.com/v3/smtp/email', {
          method: 'POST',
          headers: {
            accept: 'application/json',
            'content-type': 'application/json',
            'api-key': env.BREVO_API_KEY,
          },
          body: JSON.stringify({
            sender: { email: env.BREVO_SENDER_EMAIL, name: env.BREVO_SENDER_NAME },
            to: [{ email: mail.to }],
            replyTo: { email: env.BREVO_REPLY_TO },
            subject: mail.subject,
            htmlContent: mail.html,
            textContent: mail.text,
          }),
          signal: AbortSignal.timeout(15_000),
        });
      } catch {
        throw new Error('envoi impossible');
      }
      if (response.ok) return;
      let message = `envoi impossible (${response.status})`;
      try {
        const data = (await response.json()) as { message?: unknown };
        if (typeof data.message === 'string' && data.message.trim()) message = data.message.trim().slice(0, 300);
      } catch {
        // Corps non JSON : le message HTTP suffit.
      }
      throw new Error(message);
    },
  };
}
