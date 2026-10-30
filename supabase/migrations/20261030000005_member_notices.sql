-- Avis personnels (prelevement, resiliation) lus par l'app. Ecriture bridge seulement.

create table public.member_notices (
  id uuid primary key default gen_random_uuid(),
  event_id text not null unique,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('prelevement_retry', 'prelevement_resilie')),
  title text not null,
  body text not null,
  created_at timestamptz not null default now()
);

create index member_notices_profile_idx on public.member_notices (profile_id, created_at desc);

alter table public.member_notices enable row level security;

create policy "avis : lecture des siens" on public.member_notices
  for select to authenticated using ((select auth.uid()) = profile_id);

revoke insert, update, delete on public.member_notices from anon, authenticated;
