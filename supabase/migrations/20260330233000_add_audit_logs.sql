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

create index if not exists idx_audit_logs_created_at on public.audit_logs(created_at);
create index if not exists idx_audit_logs_org_id on public.audit_logs(org_id);
create index if not exists idx_audit_logs_payment_id on public.audit_logs(payment_id);
create index if not exists idx_audit_logs_router_id on public.audit_logs(router_id);

alter table public.audit_logs enable row level security;

drop policy if exists "Users manage own audit logs" on public.audit_logs;
create policy "Users manage own audit logs"
on public.audit_logs for select to authenticated
using (
  auth.uid() = user_id
  or org_id in (select id from public.organizations where owner_id = auth.uid())
);
