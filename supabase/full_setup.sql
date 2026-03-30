create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  email text not null default '',
  org_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'app_role' and n.nspname = 'public'
  ) then
    create type public.app_role as enum ('super_admin', 'admin', 'operator', 'support');
  end if;
end $$;

create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null default 'admin',
  unique (user_id, role)
);

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'My ISP',
  subdomain text not null unique,
  owner_id uuid not null references auth.users(id) on delete cascade,
  logo_url text,
  support_email text,
  support_phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles
  add column if not exists org_id uuid references public.organizations(id) on delete set null;

create table if not exists public.settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  org_id uuid references public.organizations(id) on delete set null,
  business_name text default 'HotSpot Pro',
  business_logo_url text,
  support_phone text,
  welcome_message text default 'Welcome to fast, reliable WiFi!',
  primary_color text default '#0ea5e9',
  background_style text default 'dark',
  portal_theme text default 'classic',
  default_payment_method text default 'till',
  till_number text,
  paybill_number text,
  account_number text,
  intasend_pub_key text,
  intasend_secret_key text,
  pesapal_consumer_key text,
  pesapal_consumer_secret text,
  paystack_pub_key text,
  paystack_secret_key text,
  enable_mpesa_till boolean default true,
  enable_mpesa_paybill boolean default false,
  enable_paystack boolean default false,
  enable_intasend boolean default false,
  enable_pesapal boolean default false,
  mac_binding boolean default true,
  auto_disconnect boolean default true,
  allow_session_resume boolean default true,
  enable_https boolean default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.packages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  org_id uuid references public.organizations(id) on delete set null,
  name text not null,
  price numeric not null default 0,
  duration_minutes integer not null default 120,
  duration_label text not null default '2 Hours',
  speed_limit text,
  data_limit text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.routers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  org_id uuid references public.organizations(id) on delete set null,
  name text not null,
  location text not null default '',
  ip_address text not null,
  api_port integer not null default 8728,
  username text not null default 'admin',
  password text not null default '',
  model text not null default 'MikroTik',
  status text not null default 'Offline',
  active_users integer not null default 0,
  payment_destination text not null default 'Till',
  disable_sharing boolean not null default false,
  device_tracking boolean not null default true,
  bandwidth_control boolean not null default true,
  session_logging boolean not null default true,
  dns_name text,
  hotspot_address text default '10.5.50.1/24',
  provision_token text default encode(gen_random_bytes(32), 'hex'),
  connection_type text default 'hotspot',
  created_at timestamptz not null default now()
);

create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  org_id uuid references public.organizations(id) on delete set null,
  router_id uuid references public.routers(id) on delete cascade,
  phone text not null,
  mac_address text,
  device_ip text,
  package_name text not null,
  login_time timestamptz not null default now(),
  logout_time timestamptz,
  duration_used integer default 0,
  expires_at timestamptz,
  status text not null default 'Active',
  created_at timestamptz not null default now()
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  org_id uuid references public.organizations(id) on delete set null,
  package_id uuid references public.packages(id) on delete set null,
  router_id uuid references public.routers(id) on delete set null,
  pppoe_account_id uuid references public.pppoe_accounts(id) on delete set null,
  phone text not null,
  package_name text not null,
  amount numeric not null default 0,
  method text not null default 'M-Pesa',
  billing_cycle text,
  period_start timestamptz,
  period_end timestamptz,
  router_name text,
  device_ip text,
  mac_address text,
  session_expiry timestamptz,
  status text not null default 'Pending',
  transaction_id text,
  provider_reference text,
  payment_context jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.vouchers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  org_id uuid references public.organizations(id) on delete set null,
  code text not null unique,
  package_id uuid references public.packages(id) on delete set null,
  package_name text not null,
  expiry_date date,
  status text not null default 'Unused',
  created_at timestamptz not null default now()
);

create table if not exists public.pppoe_accounts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  user_id uuid not null references auth.users(id) on delete cascade,
  org_id uuid references public.organizations(id) on delete set null,
  router_id uuid references public.routers(id) on delete set null,
  package_id uuid references public.packages(id) on delete set null,
  full_name text not null,
  phone text,
  username text not null,
  password text not null,
  service_status text not null default 'active',
  recurring_enabled boolean not null default true,
  billing_cycle text not null default 'monthly',
  billing_amount numeric not null default 0,
  bandwidth_profile text,
  speed_limit text,
  data_limit text,
  session_limit integer not null default 1,
  static_ip text,
  mac_address text,
  notes text,
  next_billing_date timestamptz,
  last_paid_at timestamptz,
  last_connected_at timestamptz,
  expires_at timestamptz
);

create unique index if not exists idx_pppoe_accounts_user_username
  on public.pppoe_accounts(user_id, username);

create table if not exists public.pppoe_sessions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid not null references auth.users(id) on delete cascade,
  org_id uuid references public.organizations(id) on delete set null,
  account_id uuid not null references public.pppoe_accounts(id) on delete cascade,
  router_id uuid references public.routers(id) on delete set null,
  username text not null,
  ip_address text,
  mac_address text,
  uptime_seconds integer not null default 0,
  bytes_in bigint not null default 0,
  bytes_out bigint not null default 0,
  connected_at timestamptz not null default now(),
  disconnected_at timestamptz,
  status text not null default 'online'
);

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

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid references auth.users(id) on delete set null,
  org_id uuid references public.organizations(id) on delete set null,
  router_id uuid references public.routers(id) on delete set null,
  payment_id uuid references public.payments(id) on delete set null,
  action text not null,
  status text not null default 'info',
  message text,
  meta jsonb not null default '{}'::jsonb
);

create index if not exists idx_sessions_user_id on public.sessions(user_id);
create index if not exists idx_sessions_router_id on public.sessions(router_id);
create index if not exists idx_sessions_status on public.sessions(status);
create index if not exists idx_payments_user_id on public.payments(user_id);
create index if not exists idx_payments_status on public.payments(status);
create index if not exists idx_payments_router_id on public.payments(router_id);
create index if not exists idx_payments_package_id on public.payments(package_id);
create index if not exists idx_payments_pppoe_account_id on public.payments(pppoe_account_id);
create index if not exists idx_vouchers_code on public.vouchers(code);
create index if not exists idx_vouchers_status on public.vouchers(status);
create index if not exists idx_packages_org_id on public.packages(org_id);
create index if not exists idx_routers_org_id on public.routers(org_id);
create index if not exists idx_pppoe_sessions_account_id on public.pppoe_sessions(account_id);
create index if not exists idx_pppoe_sessions_org_id on public.pppoe_sessions(org_id);
create index if not exists idx_router_health_samples_router_id on public.router_health_samples(router_id);
create index if not exists idx_router_health_samples_recorded_at on public.router_health_samples(recorded_at);
create index if not exists idx_audit_logs_created_at on public.audit_logs(created_at);
create index if not exists idx_audit_logs_org_id on public.audit_logs(org_id);
create index if not exists idx_audit_logs_payment_id on public.audit_logs(payment_id);
create index if not exists idx_audit_logs_router_id on public.audit_logs(router_id);

alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.organizations enable row level security;
alter table public.settings enable row level security;
alter table public.packages enable row level security;
alter table public.routers enable row level security;
alter table public.sessions enable row level security;
alter table public.payments enable row level security;
alter table public.vouchers enable row level security;
alter table public.pppoe_accounts enable row level security;
alter table public.pppoe_sessions enable row level security;
alter table public.router_health_samples enable row level security;
alter table public.audit_logs enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role = _role
  );
$$;

drop policy if exists "Users and admins can view profiles" on public.profiles;
drop policy if exists "Users can view own profile" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;
drop policy if exists "Users can insert own profile" on public.profiles;
drop policy if exists "Admins can delete org profiles" on public.profiles;
create policy "Users and admins can view profiles"
on public.profiles for select to authenticated
using (
  auth.uid() = id
  or org_id in (select id from public.organizations where owner_id = auth.uid())
);
create policy "Users can update own profile"
on public.profiles for update to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);
create policy "Users can insert own profile"
on public.profiles for insert to authenticated
with check (auth.uid() = id);
create policy "Admins can delete org profiles"
on public.profiles for delete to authenticated
using (
  org_id in (select id from public.organizations where owner_id = auth.uid())
  and id <> auth.uid()
);

drop policy if exists "Users and admins can view roles" on public.user_roles;
drop policy if exists "Users can view own roles" on public.user_roles;
drop policy if exists "Admins can insert roles" on public.user_roles;
drop policy if exists "Admins can update roles" on public.user_roles;
drop policy if exists "Admins can delete roles" on public.user_roles;
create policy "Users and admins can view roles"
on public.user_roles for select to authenticated
using (
  auth.uid() = user_id
  or public.has_role(auth.uid(), 'admin')
  or public.has_role(auth.uid(), 'super_admin')
);
create policy "Admins can insert roles"
on public.user_roles for insert to authenticated
with check (
  public.has_role(auth.uid(), 'admin')
  or public.has_role(auth.uid(), 'super_admin')
);
create policy "Admins can update roles"
on public.user_roles for update to authenticated
using (
  public.has_role(auth.uid(), 'admin')
  or public.has_role(auth.uid(), 'super_admin')
)
with check (
  public.has_role(auth.uid(), 'admin')
  or public.has_role(auth.uid(), 'super_admin')
);
create policy "Admins can delete roles"
on public.user_roles for delete to authenticated
using (
  public.has_role(auth.uid(), 'admin')
  or public.has_role(auth.uid(), 'super_admin')
);

drop policy if exists "Owner manages org" on public.organizations;
drop policy if exists "Public can read orgs by subdomain" on public.organizations;
create policy "Owner manages org"
on public.organizations for all to authenticated
using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);
create policy "Public can read orgs by subdomain"
on public.organizations for select to anon
using (true);

drop policy if exists "Users manage own settings" on public.settings;
drop policy if exists "Public can read settings" on public.settings;
create policy "Users manage own settings"
on public.settings for all to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
create policy "Public can read settings"
on public.settings for select to anon
using (true);

drop policy if exists "Users manage own packages" on public.packages;
drop policy if exists "Public can read active packages" on public.packages;
create policy "Users manage own packages"
on public.packages for all to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
create policy "Public can read active packages"
on public.packages for select to anon
using (active = true);

drop policy if exists "Users manage own routers" on public.routers;
create policy "Users manage own routers"
on public.routers for all to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users manage own sessions" on public.sessions;
create policy "Users manage own sessions"
on public.sessions for all to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users manage own payments" on public.payments;
create policy "Users manage own payments"
on public.payments for all to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users manage own vouchers" on public.vouchers;
create policy "Users manage own vouchers"
on public.vouchers for all to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users manage own pppoe accounts" on public.pppoe_accounts;
create policy "Users manage own pppoe accounts"
on public.pppoe_accounts for all to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users manage own pppoe sessions" on public.pppoe_sessions;
create policy "Users manage own pppoe sessions"
on public.pppoe_sessions for all to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users manage own router health samples" on public.router_health_samples;
create policy "Users manage own router health samples"
on public.router_health_samples for all to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users manage own audit logs" on public.audit_logs;
create policy "Users manage own audit logs"
on public.audit_logs for select to authenticated
using (
  auth.uid() = user_id
  or org_id in (select id from public.organizations where owner_id = auth.uid())
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  new_org_id uuid;
  requested_subdomain text;
  subdomain_val text;
begin
  requested_subdomain := coalesce(
    new.raw_user_meta_data->>'subdomain',
    new.raw_user_meta_data->>'isp_name',
    split_part(new.email, '@', 1)
  );

  subdomain_val := lower(regexp_replace(requested_subdomain, '[^a-z0-9]', '-', 'g'));
  subdomain_val := trim(both '-' from subdomain_val);

  if subdomain_val = '' then
    subdomain_val := 'isp-' || substr(gen_random_uuid()::text, 1, 6);
  end if;

  if exists (select 1 from public.organizations where subdomain = subdomain_val) then
    subdomain_val := subdomain_val || '-' || substr(gen_random_uuid()::text, 1, 6);
  end if;

  insert into public.organizations (name, subdomain, owner_id, support_email)
  values (
    coalesce(new.raw_user_meta_data->>'isp_name', 'My ISP'),
    subdomain_val,
    new.id,
    new.email
  )
  returning id into new_org_id;

  insert into public.profiles (id, full_name, email, org_id)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    new.email,
    new_org_id
  )
  on conflict (id) do update
  set
    full_name = excluded.full_name,
    email = excluded.email,
    org_id = excluded.org_id;

  insert into public.user_roles (user_id, role)
  values (new.id, 'admin')
  on conflict (user_id, role) do nothing;

  insert into public.settings (user_id, org_id, business_name)
  values (
    new.id,
    new_org_id,
    coalesce(new.raw_user_meta_data->>'isp_name', 'My ISP')
  )
  on conflict (user_id) do update
  set
    org_id = excluded.org_id,
    business_name = excluded.business_name;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();
