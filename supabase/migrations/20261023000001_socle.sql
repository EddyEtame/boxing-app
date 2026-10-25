-- Socle de la phase 1 : comptes, rapprochement Deciplus, etat de la fiche.
-- Regle d'acces : l'app ne lit que ses propres lignes ; toute ecriture passe
-- par le serveur applicatif (apps/bridge) avec la cle de service.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  prenom text not null default '',
  nom text not null default '',
  email text not null default '',
  telephone text not null default '',
  date_naissance date,
  club_principal text check (club_principal in ('minimes', 'saint-cyprien', 'etats-unis', 'ramonville', 'portet')),
  link_status text not null default 'en_attente' check (link_status in ('en_attente', 'lie', 'a_revoir', 'prospect')),
  link_updated_at timestamptz,
  deciplus_member_id text,
  consentement_parental_requis boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index profiles_deciplus_member_id_key on public.profiles (deciplus_member_id) where deciplus_member_id is not null;

-- Le dernier etat lu par le robot, avec sa date. Rien d'autre de la fiche n'est garde.
create table public.deciplus_snapshots (
  profile_id uuid primary key references public.profiles (id) on delete cascade,
  abonnement_actif boolean not null default false,
  abonnement_en_attente boolean not null default false,
  badge_enregistre boolean not null default false,
  contrats text[] not null default '{}',
  club text,
  read_at timestamptz not null default now()
);

-- Chaque demande de rapprochement envoyee au robot, et sa suite.
create table public.link_requests (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  order_id text not null unique,
  status text not null default 'envoye' check (status in ('envoye', 'lie', 'a_revoir', 'prospect', 'erreur', 'resolu')),
  deciplus_member_id text,
  mismatch_fields text[] not null default '{}',
  reason text,
  resolution text check (resolution in ('lie', 'refuse')),
  resolved_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  resolved_at timestamptz
);

create index link_requests_profile_idx on public.link_requests (profile_id, created_at desc);
create index link_requests_review_idx on public.link_requests (status) where status = 'a_revoir';

-- Appareils et jetons de notification (le badge viendra s'y attacher).
create table public.devices (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  platform text not null check (platform in ('ios', 'android', 'web')),
  push_token text,
  app_version text,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create unique index devices_push_token_key on public.devices (push_token) where push_token is not null;

-- Roles du staff pour l'admin (CDC §15). Les adherents n'y figurent pas.
create table public.staff_roles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  role text not null check (role in ('direction', 'communication', 'administratif', 'coach')),
  created_at timestamptz not null default now()
);

create table public.audit_log (
  id bigint generated always as identity primary key,
  actor uuid references auth.users (id) on delete set null,
  action text not null,
  target uuid,
  details jsonb not null default '{}',
  at timestamptz not null default now()
);

-- Mesure d'usage anonyme (contrat @bc/contract/events) : aucun identifiant personnel.
create table public.app_events (
  id text primary key,
  name text not null,
  at timestamptz not null,
  anon_id text not null,
  visit text not null,
  statut text not null,
  locale text not null,
  scheme text not null,
  platform text not null,
  app_version text not null,
  path text,
  props jsonb,
  received_at timestamptz not null default now()
);

create index app_events_at_idx on public.app_events (at desc);

-- Droits : RLS partout, lecture de ses propres lignes seulement.
alter table public.profiles enable row level security;
alter table public.deciplus_snapshots enable row level security;
alter table public.link_requests enable row level security;
alter table public.devices enable row level security;
alter table public.staff_roles enable row level security;
alter table public.audit_log enable row level security;
alter table public.app_events enable row level security;

create policy "profil : lecture du sien" on public.profiles
  for select to authenticated using ((select auth.uid()) = id);

create policy "fiche : lecture de la sienne" on public.deciplus_snapshots
  for select to authenticated using ((select auth.uid()) = profile_id);

create policy "role staff : lecture du sien" on public.staff_roles
  for select to authenticated using ((select auth.uid()) = user_id);

revoke all on public.link_requests, public.devices, public.audit_log, public.app_events from anon, authenticated;
revoke insert, update, delete on public.profiles, public.deciplus_snapshots, public.staff_roles from anon, authenticated;

-- Le profil nait avec le compte, depuis les champs saisis a l'inscription.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  naissance date;
begin
  begin
    naissance := nullif(meta ->> 'date_naissance', '')::date;
  exception when others then
    naissance := null;
  end;
  insert into public.profiles (id, prenom, nom, email, telephone, date_naissance, consentement_parental_requis)
  values (
    new.id,
    left(coalesce(meta ->> 'prenom', ''), 80),
    left(coalesce(meta ->> 'nom', ''), 80),
    lower(coalesce(new.email, '')),
    left(coalesce(meta ->> 'telephone', ''), 20),
    naissance,
    naissance is not null and naissance > (current_date - interval '15 years')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute function public.touch_updated_at();
