alter table public.payments
  add column if not exists package_id uuid references public.packages(id) on delete set null,
  add column if not exists router_id uuid references public.routers(id) on delete set null,
  add column if not exists device_ip text,
  add column if not exists mac_address text,
  add column if not exists provider_reference text,
  add column if not exists payment_context jsonb not null default '{}'::jsonb;

create index if not exists idx_payments_router_id on public.payments(router_id);
create index if not exists idx_payments_package_id on public.payments(package_id);
