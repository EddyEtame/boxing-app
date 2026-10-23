import { isClubId } from '@/lib/clubs';
import type { PublicTraining, TrainingCreated, TrainingsResponse } from '@/lib/public/team';
import type { FeatureKey } from '@/lib/types';
import { read, readFeatures } from '@/server/collections';
import { clientIp, corsHeaders, json } from '@/server/http';
import { checkProposalInput, parisNow, submitFromApp } from '@/server/moderation';
import { hit } from '@/server/rate-limit';

/**
 * Les entraînements entre membres, côté app (CDC §11).
 *
 * GET : les propositions en ligne et à venir, avec ce que le CDC §11 B
 * demande d'afficher — jamais le nom ni le numéro de l'organisateur.
 *
 * POST : une nouvelle proposition. Vérifiée champ par champ, passée aux
 * contrôles de la modération, puis « à vérifier » (prémodération ou contrôle
 * bloquant) ou en ligne. Tant que l'app n'a pas de connexion adhérent, le
 * numéro et l'âge sont déclarés par l'app, pas prouvés : l'équipe le sait.
 */
const METHODS = 'GET, POST, OPTIONS';
const MAX_BODY = 4096;

export function OPTIONS(request: Request) {
  return new Response(null, { status: 204, headers: corsHeaders(request, METHODS) });
}

export async function GET(request: Request) {
  const headers = corsHeaders(request, METHODS);
  const v = hit(`entrainements:get:${clientIp(request.headers)}`, 120, 60_000);
  if (!v.ok) {
    headers.set('Retry-After', String(v.retryAfterSec));
    return json({ error: 'debit' }, { status: 429, headers });
  }
  const club = new URL(request.url).searchParams.get('club');
  if (club !== null && !isClubId(club)) return json({ error: 'club' }, { status: 400, headers });

  const features = await readFeatures();
  const now = parisNow();
  const updatedAt = new Date().toISOString();
  if (!features.entrainements.on) return json({ items: [], off: true, updatedAt } satisfies TrainingsResponse, { headers });

  const items: PublicTraining[] = (await read('propositions'))
    .filter((p) => p.status === 'en-ligne' && features[`entrainements.${p.type}` as FeatureKey].on && (!club || p.club === club))
    .filter((p) => p.date > now.ymd || (p.date === now.ymd && p.debut >= now.minutes))
    .sort((a, b) => a.date.localeCompare(b.date) || a.debut - b.debut)
    .map((p) => ({
      id: p.id,
      club: p.club,
      date: p.date,
      heure: `${String(Math.floor(p.debut / 60)).padStart(2, '0')}:${String(p.debut % 60).padStart(2, '0')}`,
      debut: p.debut,
      type: p.type,
      niveau: p.niveau,
      ...(p.observation ? { observation: p.observation } : {}),
      participants: p.participants,
      organisateur: { prenom: p.organizer.prenom },
    }));
  return json({ items, off: false, updatedAt } satisfies TrainingsResponse, { headers });
}

export async function POST(request: Request) {
  const headers = corsHeaders(request, METHODS);
  const ip = clientIp(request.headers);
  const byIp = hit(`entrainements:post:${ip}`, 10, 3_600_000);
  if (!byIp.ok) {
    headers.set('Retry-After', String(byIp.retryAfterSec));
    return json({ error: 'debit' }, { status: 429, headers });
  }
  const declared = Number(request.headers.get('content-length') ?? '0');
  if (declared > MAX_BODY) return json({ error: 'trop_gros' }, { status: 413, headers });
  const raw = await request.text();
  if (raw.length > MAX_BODY) return json({ error: 'trop_gros' }, { status: 413, headers });
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return json({ error: 'json' }, { status: 400, headers });
  }

  const { input, errors } = checkProposalInput(body, parisNow().ymd);
  if (!input) return json({ error: 'champs', champs: errors }, { status: 400, headers });

  const features = await readFeatures();
  if (!features.entrainements.on) return json({ error: 'coupee', quoi: 'entrainements' }, { status: 403, headers });
  if (!features[`entrainements.${input.type}` as FeatureKey].on) return json({ error: 'coupee', quoi: input.type }, { status: 403, headers });

  // Cinq propositions par jour et par adhérent : au-delà, ce n'est plus un entraînement, c'est une annonce.
  const byMember = hit(`entrainements:membre:${input.organizer.memberId}`, 5, 86_400_000);
  if (!byMember.ok) {
    headers.set('Retry-After', String(byMember.retryAfterSec));
    return json({ error: 'debit' }, { status: 429, headers });
  }

  const created: TrainingCreated = await submitFromApp(input);
  return json(created, { status: 201, headers });
}
