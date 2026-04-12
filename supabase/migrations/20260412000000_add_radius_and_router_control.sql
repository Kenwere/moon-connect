-- Add RADIUS and enhanced router management features

-- Add new columns to routers table
ALTER TABLE public.routers ADD COLUMN IF NOT EXISTS connection_type TEXT NOT NULL DEFAULT 'hotspot' CHECK (connection_type IN ('hotspot', 'pppoe', 'both'));
ALTER TABLE public.routers ADD COLUMN IF NOT EXISTS radius_server_ip TEXT;
ALTER TABLE public.routers ADD COLUMN IF NOT EXISTS radius_server_secret TEXT;
ALTER TABLE public.routers ADD COLUMN IF NOT EXISTS hotspot_interfaces TEXT[] DEFAULT ARRAY['ether2'];
ALTER TABLE public.routers ADD COLUMN IF NOT EXISTS pppoe_interfaces TEXT[] DEFAULT ARRAY['ether1'];
ALTER TABLE public.routers ADD COLUMN IF NOT EXISTS router_control_enabled BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE public.routers ADD COLUMN IF NOT EXISTS last_command_at TIMESTAMPTZ;
ALTER TABLE public.routers ADD COLUMN IF NOT EXISTS provision_token TEXT;

-- Create RADIUS server table
CREATE TABLE IF NOT EXISTS public.radius_servers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  ip_address TEXT NOT NULL,
  secret TEXT NOT NULL,
  port INTEGER NOT NULL DEFAULT 1812,
  status TEXT NOT NULL DEFAULT 'active',
  description TEXT
);

-- Create router logs table
CREATE TABLE IF NOT EXISTS public.router_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  router_id UUID REFERENCES public.routers(id) ON DELETE CASCADE,
  level TEXT NOT NULL DEFAULT 'info' CHECK (level IN ('debug', 'info', 'warning', 'error')),
  message TEXT NOT NULL,
  command TEXT,
  response TEXT,
  metadata JSONB DEFAULT '{}'
);

-- Create router commands table for remote control
CREATE TABLE IF NOT EXISTS public.router_commands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  router_id UUID REFERENCES public.routers(id) ON DELETE CASCADE,
  command_type TEXT NOT NULL CHECK (command_type IN ('reboot', 'restart_services', 'update_config', 'custom')),
  command_text TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  executed_at TIMESTAMPTZ,
  result TEXT,
  error_message TEXT,
  requested_by UUID REFERENCES auth.users(id)
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_router_logs_router_id ON public.router_logs(router_id);
CREATE INDEX IF NOT EXISTS idx_router_logs_created_at ON public.router_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_router_commands_router_id ON public.router_commands(router_id);
CREATE INDEX IF NOT EXISTS idx_router_commands_status ON public.router_commands(status);
CREATE INDEX IF NOT EXISTS idx_radius_servers_org_id ON public.radius_servers(org_id);

-- Enable RLS
ALTER TABLE public.radius_servers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.router_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.router_commands ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Organizations manage radius servers" ON public.radius_servers
FOR ALL TO authenticated
USING (
  org_id IN (
    SELECT org_id FROM public.profiles WHERE id = auth.uid()
  )
)
WITH CHECK (
  org_id IN (
    SELECT org_id FROM public.profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Users view router logs" ON public.router_logs
FOR SELECT TO authenticated
USING (
  router_id IN (
    SELECT id FROM public.routers WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users manage router commands" ON public.router_commands
FOR ALL TO authenticated
USING (
  router_id IN (
    SELECT id FROM public.routers WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  router_id IN (
    SELECT id FROM public.routers WHERE user_id = auth.uid()
  )
);

-- Add provision_token to routers if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'routers' AND column_name = 'provision_token'
  ) THEN
    ALTER TABLE public.routers ADD COLUMN provision_token TEXT;
  END IF;
END $$;

-- Generate provision tokens for existing routers
UPDATE public.routers
SET provision_token = encode(gen_random_bytes(16), 'hex')
WHERE provision_token IS NULL;