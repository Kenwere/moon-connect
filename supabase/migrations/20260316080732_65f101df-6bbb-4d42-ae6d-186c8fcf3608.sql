
-- Add portal_theme to settings
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS portal_theme text DEFAULT 'classic';

-- Add connection_type to routers (hotspot or pppoe)
ALTER TABLE public.routers ADD COLUMN IF NOT EXISTS connection_type text DEFAULT 'hotspot';

-- Allow anonymous/public read of packages by org_id (for captive portal)
CREATE POLICY "Public can read active packages"
ON public.packages
FOR SELECT
TO anon
USING (active = true);

-- Allow anonymous/public read of settings by org_id (for captive portal theming)
CREATE POLICY "Public can read settings"
ON public.settings
FOR SELECT
TO anon
USING (true);

-- Allow anonymous/public read of organizations by subdomain (for portal lookup)
CREATE POLICY "Public can read orgs by subdomain"
ON public.organizations
FOR SELECT
TO anon
USING (true);
