alter table public.pppoe_accounts
  add column if not exists recurring_enabled boolean not null default true,
  add column if not exists billing_cycle text not null default 'monthly',
  add column if not exists billing_amount numeric not null default 0,
  add column if not exists next_billing_date timestamptz,
  add column if not exists last_paid_at timestamptz;

alter table public.payments
  add column if not exists pppoe_account_id uuid references public.pppoe_accounts(id) on delete set null,
  add column if not exists billing_cycle text,
  add column if not exists period_start timestamptz,
  add column if not exists period_end timestamptz;

create index if not exists idx_payments_pppoe_account_id on public.payments(pppoe_account_id);

create table if not exists public.router_health_samples (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid not null references auth.users(id) on delete cascade,
  org_id uuid references public.organizations(id) on delete set null,
  router_id uuid not null references public.routers(id) on delete cascade,
  router_name text not null,
  is_online boolean not null default false,
  uptime_seconds integer not null default 0,
  downtime_seconds integer not null default 0,
  sample_interval_seconds integer not null default 300,
  recorded_at timestamptz not null default now()
);

create index if not exists idx_router_health_samples_router_id on public.router_health_samples(router_id);
create index if not exists idx_router_health_samples_recorded_at on public.router_health_samples(recorded_at);

alter table public.router_health_samples enable row level security;

drop policy if exists "Users manage own router health samples" on public.router_health_samples;
create policy "Users manage own router health samples"
on public.router_health_samples for all to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
