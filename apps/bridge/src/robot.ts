import type { Env } from './env.ts';

const GYMS = new Set(['minimes', 'st-cyprien', 'etats-unis', 'ramonville', 'portet']);

/** Cle de salle BOXPLUS. saint-cyprien (app) devient st-cyprien ; defaut minimes. */
export function gymForClub(club: string | null | undefined): string {
  if (club === 'saint-cyprien') return 'st-cyprien';
  if (club && GYMS.has(club)) return club;
  return 'minimes';
}

export type LookupJob = {
  orderId: string;
  gym: string;
  deciplusMemberId?: string;
  customer: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    birthdate: string;
  };
};

export type RobotHealth =
  | { ok: true; ready: boolean; version: string }
  | { ok: false; ready: boolean; version: string }
  | { ok: false };

export type Robot = {
  sendLookup(job: LookupJob): Promise<void>;
  health(): Promise<RobotHealth>;
};

type FetchLike = typeof fetch;

export function createRobot(env: Env, fetchImpl: FetchLike = fetch): Robot {
  const base = env.BOT_URL.replace(/\/+$/, '');
  return {
    async sendLookup(job) {
      const payload: Record<string, unknown> = {
        action: 'app_member_lookup',
        order_id: job.orderId,
        status_callback_base: env.PUBLIC_URL.replace(/\/+$/, ''),
        gym: job.gym,
        customer: {
          first_name: job.customer.firstName,
          last_name: job.customer.lastName,
          email: job.customer.email,
          phone: job.customer.phone,
          birthdate: job.customer.birthdate,
        },
      };
      if (job.deciplusMemberId) payload.deciplus_member_id = job.deciplusMemberId;
      let response: Response;
      try {
        response = await fetchImpl(`${base}/api/jobs`, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-sync-secret': env.BOT_SYNC_SECRET,
          },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(10_000),
        });
      } catch {
        throw new Error('robot_indisponible');
      }
      if (!response.ok) throw new Error('robot_indisponible');
    },
    async health() {
      try {
        const response = await fetchImpl(`${base}/health`, { signal: AbortSignal.timeout(3_000) });
        if (!response.ok) return { ok: false };
        const data = (await response.json()) as { ok?: unknown; ready?: unknown; version?: unknown };
        return {
          ok: data.ok === true,
          ready: data.ready === true,
          version: typeof data.version === 'string' ? data.version : '',
        };
      } catch {
        return { ok: false };
      }
    },
  };
}
