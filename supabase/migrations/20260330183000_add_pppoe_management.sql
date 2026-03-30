-- PPPoE subscriber and session management

CREATE TABLE IF NOT EXISTS public.pppoe_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  user_id uuid NOT NULL,
  org_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  router_id uuid REFERENCES public.routers(id) ON DELETE SET NULL,
  package_id uuid REFERENCES public.packages(id) ON DELETE SET NULL,
  full_name text NOT NULL,
  phone text,
  username text NOT NULL,
  password text NOT NULL,
  service_status text NOT NULL DEFAULT 'active',
  bandwidth_profile text,
  speed_limit text,
  data_limit text,
  session_limit integer NOT NULL DEFAULT 1,
  static_ip text,
  mac_address text,
  notes text,
  last_connected_at timestamptz,
  expires_at timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_pppoe_accounts_user_username
  ON public.pppoe_accounts(user_id, username);

CREATE INDEX IF NOT EXISTS idx_pppoe_accounts_org_id
  ON public.pppoe_accounts(org_id);

CREATE INDEX IF NOT EXISTS idx_pppoe_accounts_router_id
  ON public.pppoe_accounts(router_id);

CREATE INDEX IF NOT EXISTS idx_pppoe_accounts_status
  ON public.pppoe_accounts(service_status);

ALTER TABLE public.pppoe_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own pppoe accounts"
ON public.pppoe_accounts
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.pppoe_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  user_id uuid NOT NULL,
  org_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  account_id uuid NOT NULL REFERENCES public.pppoe_accounts(id) ON DELETE CASCADE,
  router_id uuid REFERENCES public.routers(id) ON DELETE SET NULL,
  username text NOT NULL,
  ip_address text,
  mac_address text,
  uptime_seconds integer NOT NULL DEFAULT 0,
  bytes_in bigint NOT NULL DEFAULT 0,
  bytes_out bigint NOT NULL DEFAULT 0,
  connected_at timestamptz NOT NULL DEFAULT now(),
  disconnected_at timestamptz,
  status text NOT NULL DEFAULT 'online'
);

CREATE INDEX IF NOT EXISTS idx_pppoe_sessions_account_id
  ON public.pppoe_sessions(account_id);

CREATE INDEX IF NOT EXISTS idx_pppoe_sessions_org_id
  ON public.pppoe_sessions(org_id);

CREATE INDEX IF NOT EXISTS idx_pppoe_sessions_status
  ON public.pppoe_sessions(status);

ALTER TABLE public.pppoe_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own pppoe sessions"
ON public.pppoe_sessions
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
