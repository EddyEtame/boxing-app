-- Signaux temps reel : l'admin (JSON), le bridge et le mobile s'abonnent aux INSERT.
-- Le payload ne contient pas de secrets ; les donnees restent sur l'admin ou le bridge.

create table public.live_signals (
  id bigint generated always as identity primary key,
  domain text not null,
  action text not null,
  payload jsonb not null default '{}',
  club text check (club is null or club in ('minimes', 'saint-cyprien', 'etats-unis', 'ramonville', 'portet')),
  profile_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index live_signals_created_idx on public.live_signals (created_at desc);
create index live_signals_domain_idx on public.live_signals (domain, created_at desc);

alter table public.live_signals enable row level security;

create policy "live_signals : lecture publique" on public.live_signals
  for select to anon, authenticated
  using (true);

revoke insert, update, delete on public.live_signals from anon, authenticated;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.live_signals;
  end if;
end $$;
