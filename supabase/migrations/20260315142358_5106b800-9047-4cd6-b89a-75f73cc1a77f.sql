
-- Add org_id to profiles for team membership
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES public.organizations(id);

-- Backfill existing profiles
UPDATE public.profiles p SET org_id = o.id FROM public.organizations o WHERE o.owner_id = p.id AND p.org_id IS NULL;

-- Add expires_at to sessions for auto-disconnect
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS expires_at timestamp with time zone;

-- Update handle_new_user to set org_id on profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE new_org_id uuid; subdomain_val text;
BEGIN
  subdomain_val := lower(regexp_replace(COALESCE(NEW.raw_user_meta_data->>'isp_name', split_part(NEW.email, '@', 1)), '[^a-z0-9]', '-', 'g'));
  subdomain_val := trim(both '-' from subdomain_val);
  IF EXISTS (SELECT 1 FROM public.organizations WHERE subdomain = subdomain_val) THEN
    subdomain_val := subdomain_val || '-' || substr(gen_random_uuid()::text, 1, 6);
  END IF;

  INSERT INTO public.organizations (name, subdomain, owner_id, support_email)
  VALUES (COALESCE(NEW.raw_user_meta_data->>'isp_name', 'My ISP'), subdomain_val, NEW.id, NEW.email)
  RETURNING id INTO new_org_id;

  INSERT INTO public.profiles (id, full_name, email, org_id)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''), NEW.email, new_org_id);

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');

  INSERT INTO public.settings (user_id, org_id, business_name)
  VALUES (NEW.id, new_org_id, COALESCE(NEW.raw_user_meta_data->>'isp_name', 'My ISP'));

  RETURN NEW;
END;
$$;

-- Update profile RLS for team visibility
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users and admins can view profiles" ON public.profiles FOR SELECT TO authenticated
USING (auth.uid() = id OR org_id IN (SELECT id FROM public.organizations WHERE owner_id = auth.uid()));

CREATE POLICY "Admins can delete org profiles" ON public.profiles FOR DELETE TO authenticated
USING (org_id IN (SELECT id FROM public.organizations WHERE owner_id = auth.uid()) AND id != auth.uid());

-- Allow admins to manage user_roles
CREATE POLICY "Admins can insert roles" ON public.user_roles FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Admins can update roles" ON public.user_roles FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Admins can delete roles" ON public.user_roles FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
CREATE POLICY "Users and admins can view roles" ON public.user_roles FOR SELECT TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));
