import { z } from 'zod';

const schema = z.object({
  PORT: z.number().int().min(1).max(65535),
  HOST: z.string().min(1),
  PUBLIC_URL: z.string().regex(/^https:\/\/\S+$/),
  SUPABASE_URL: z.string().regex(/^https:\/\/\S+$/),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  BOT_URL: z.string().regex(/^https?:\/\/\S+$/),
  BOT_SYNC_SECRET: z.string().min(1),
  APP_BRIDGE_SECRET: z.string().min(1),
  ADMIN_BRIDGE_SECRET: z.string().min(1),
  SEND_EMAIL_HOOK_SECRET: z.string().regex(/^v1,whsec_[A-Za-z0-9+/=_-]+$/),
  BREVO_API_KEY: z.string().min(1),
  BREVO_SENDER_EMAIL: z.string().regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/),
  BREVO_SENDER_NAME: z.string().min(1),
  BREVO_REPLY_TO: z.string().regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/),
});

export type Env = z.infer<typeof schema>;

function pick(source: NodeJS.ProcessEnv, key: string): string | undefined {
  const value = source[key];
  if (value == null) return undefined;
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
}

function portOf(source: NodeJS.ProcessEnv): number {
  const text = pick(source, 'PORT');
  if (text === undefined) return 8080;
  return Number(text);
}

/** Lit et valide l'environnement. Les champs vides comptent comme absents. */
export function readEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const parsed = schema.safeParse({
    PORT: portOf(source),
    HOST: pick(source, 'HOST') ?? '0.0.0.0',
    PUBLIC_URL: pick(source, 'PUBLIC_URL') ?? '',
    SUPABASE_URL: pick(source, 'SUPABASE_URL') ?? '',
    SUPABASE_SERVICE_ROLE_KEY: pick(source, 'SUPABASE_SERVICE_ROLE_KEY') ?? '',
    BOT_URL: pick(source, 'BOT_URL') ?? 'http://127.0.0.1:3050',
    BOT_SYNC_SECRET: pick(source, 'BOT_SYNC_SECRET') ?? '',
    APP_BRIDGE_SECRET: pick(source, 'APP_BRIDGE_SECRET') ?? '',
    ADMIN_BRIDGE_SECRET: pick(source, 'ADMIN_BRIDGE_SECRET') ?? '',
    SEND_EMAIL_HOOK_SECRET: pick(source, 'SEND_EMAIL_HOOK_SECRET') ?? '',
    BREVO_API_KEY: pick(source, 'BREVO_API_KEY') ?? '',
    BREVO_SENDER_EMAIL: pick(source, 'BREVO_SENDER_EMAIL') ?? 'suzinabot@gmail.com',
    BREVO_SENDER_NAME: pick(source, 'BREVO_SENDER_NAME') ?? 'Boxing Center',
    BREVO_REPLY_TO: pick(source, 'BREVO_REPLY_TO') ?? 'boxingcenter31@gmail.com',
  });
  if (!parsed.success) {
    const fields = parsed.error.issues.map((issue) => issue.path.join('.') || 'env').join(', ');
    throw new Error(`Variables d'environnement invalides: ${fields}`);
  }
  return parsed.data;
}
