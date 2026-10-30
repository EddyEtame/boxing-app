-- Au plus un passage par jour calendaire (Europe/Paris) et par profil.
-- Ecriture exclusivement via apps/bridge (service_role).

create table public.member_passages (
  profile_id uuid not null references public.profiles (id) on delete cascade,
  day date not null,
  source text not null,
  created_at timestamptz not null default now(),
  constraint member_passages_profile_day_key unique (profile_id, day)
);

create index member_passages_profile_day_idx on public.member_passages (profile_id, day desc);

alter table public.member_passages enable row level security;

create policy "passages : lecture des siens" on public.member_passages
  for select to authenticated using ((select auth.uid()) = profile_id);

revoke insert, update, delete on public.member_passages from anon, authenticated;
