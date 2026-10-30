-- Phase 2 commerce : prise d'offre depuis l'app, etat d'abonnement, index factures.
-- Ecriture exclusivement via apps/bridge (service_role). Realtime sur Supabase cloud.

create table public.checkout_sessions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  boxplus_order_id text unique,
  offer_slug text not null,
  club text not null check (club in ('minimes', 'saint-cyprien', 'etats-unis', 'ramonville', 'portet')),
  payment_provider text check (payment_provider in ('payplug', 'scalapay', 'sepa', 'free_trial')),
  amount_cents integer not null default 0 check (amount_cents >= 0),
  currency text not null default 'EUR',
  status text not null default 'opened' check (
    status in (
      'opened',
      'payment_pending',
      'paid_pending_deciplus',
      'completed',
      'failed',
      'expired',
      'manual_review'
    )
  ),
  deciplus_member_id text,
  deciplus_sale_id text,
  error_code text,
  expires_at timestamptz not null default (now() + interval '45 minutes'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index checkout_sessions_profile_idx on public.checkout_sessions (profile_id, created_at desc);
create index checkout_sessions_active_idx on public.checkout_sessions (status)
  where status in ('opened', 'payment_pending', 'paid_pending_deciplus');

create table public.subscription_state (
  profile_id uuid primary key references public.profiles (id) on delete cascade,
  deciplus_member_id text,
  club text check (club in ('minimes', 'saint-cyprien', 'etats-unis', 'ramonville', 'portet')),
  status text not null default 'none' check (
    status in ('none', 'activating', 'active', 'past_due', 'cancel_scheduled', 'ended', 'manual_review')
  ),
  plan_code text,
  plan_label text,
  billing_mode text check (billing_mode in ('comptant', 'prelevement_mensuel', 'payplug_4x', 'scalapay', 'carte_seances')),
  current_period_start date,
  current_period_end date,
  next_charge_date date,
  next_charge_cents integer,
  cancel_effective_date date,
  badge_active boolean not null default false,
  last_order_id text,
  last_deciplus_sync_at timestamptz,
  updated_at timestamptz not null default now()
);

create table public.invoices_index (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  invoice_number text not null,
  boxplus_order_id text not null,
  deciplus_sale_id text,
  club text not null check (club in ('minimes', 'saint-cyprien', 'etats-unis', 'ramonville', 'portet')),
  label text not null,
  amount_ht_cents integer not null default 0 check (amount_ht_cents >= 0),
  amount_tva_cents integer not null default 0 check (amount_tva_cents >= 0),
  amount_ttc_cents integer not null default 0 check (amount_ttc_cents >= 0),
  status text not null default 'paid' check (status in ('paid', 'refunded', 'void')),
  issued_at timestamptz not null,
  storage_path text not null,
  sha256_hex text not null,
  created_at timestamptz not null default now()
);

create unique index invoices_index_number_key on public.invoices_index (invoice_number);
create index invoices_index_profile_issued_idx on public.invoices_index (profile_id, issued_at desc);

create table public.shop_events (
  event_id text primary key,
  type text not null,
  order_id text,
  profile_id uuid references public.profiles (id) on delete set null,
  status text not null default 'recu' check (status in ('recu', 'rattache', 'orphelin', 'traite', 'ignore')),
  payload jsonb not null default '{}',
  received_at timestamptz not null default now()
);

create index shop_events_order_idx on public.shop_events (order_id) where order_id is not null;

create trigger checkout_sessions_touch_updated_at
  before update on public.checkout_sessions
  for each row execute function public.touch_updated_at();

create trigger subscription_state_touch_updated_at
  before update on public.subscription_state
  for each row execute function public.touch_updated_at();

alter table public.checkout_sessions enable row level security;
alter table public.subscription_state enable row level security;
alter table public.invoices_index enable row level security;
alter table public.shop_events enable row level security;

create policy "checkout : lecture des siennes" on public.checkout_sessions
  for select to authenticated using ((select auth.uid()) = profile_id);

create policy "abonnement : lecture du sien" on public.subscription_state
  for select to authenticated using ((select auth.uid()) = profile_id);

create policy "factures : lecture des siennes" on public.invoices_index
  for select to authenticated using ((select auth.uid()) = profile_id);

revoke all on public.shop_events from anon, authenticated;
revoke insert, update, delete on public.checkout_sessions, public.subscription_state, public.invoices_index from anon, authenticated;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.checkout_sessions;
    alter publication supabase_realtime add table public.subscription_state;
    alter publication supabase_realtime add table public.invoices_index;
  end if;
end $$;
