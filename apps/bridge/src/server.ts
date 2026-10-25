import { buildApp } from './app.ts';
import { readEnv } from './env.ts';
import { createMailer } from './mailer.ts';
import { createRobot } from './robot.ts';
import { createSupabase, createSupabaseStore, createVerifier } from './store.ts';

const env = readEnv();
const supabase = createSupabase(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const app = await buildApp({
  env,
  store: createSupabaseStore(supabase),
  robot: createRobot(env),
  mailer: createMailer(env),
  verifyUser: createVerifier(supabase),
  now: () => new Date(),
});

try {
  await app.listen({ port: env.PORT, host: env.HOST });
} catch (err) {
  app.log.error({ err }, 'ecoute impossible');
  process.exit(1);
}
