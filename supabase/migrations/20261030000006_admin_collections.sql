-- Collections de l'admin (actualites, planning, comptes, journal, ...) et colonnes staff.
-- A executer dans l'editeur SQL Supabase. Ne pas relancer le socle.

create table if not exists public.admin_collections (
  name text primary key,
  body jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.admin_collections enable row level security;
revoke all on public.admin_collections from anon, authenticated;

alter table public.staff_roles add column if not exists email text;
alter table public.staff_roles add column if not exists name text;
alter table public.staff_roles add column if not exists clubs jsonb not null default '[]'::jsonb;
alter table public.staff_roles add column if not exists status text not null default 'actif';
alter table public.staff_roles add column if not exists signature text;
alter table public.staff_roles add column if not exists account_id text;
