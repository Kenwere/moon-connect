-- Prefer an explicitly requested subdomain during signup.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  new_org_id uuid;
  requested_subdomain text;
  subdomain_val text;
BEGIN
  requested_subdomain := COALESCE(
    NEW.raw_user_meta_data->>'subdomain',
    NEW.raw_user_meta_data->>'isp_name',
    split_part(NEW.email, '@', 1)
  );

  subdomain_val := lower(regexp_replace(requested_subdomain, '[^a-z0-9]', '-', 'g'));
  subdomain_val := trim(both '-' from subdomain_val);

  IF subdomain_val = '' THEN
    subdomain_val := 'isp-' || substr(gen_random_uuid()::text, 1, 6);
  END IF;

  IF EXISTS (SELECT 1 FROM public.organizations WHERE subdomain = subdomain_val) THEN
    subdomain_val := subdomain_val || '-' || substr(gen_random_uuid()::text, 1, 6);
  END IF;

  INSERT INTO public.organizations (name, subdomain, owner_id, support_email)
  VALUES (
    COALESCE(NEW.raw_user_meta_data->>'isp_name', 'My ISP'),
    subdomain_val,
    NEW.id,
    NEW.email
  )
  RETURNING id INTO new_org_id;

  INSERT INTO public.profiles (id, full_name, email, org_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.email,
    new_org_id
  );

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');

  INSERT INTO public.settings (user_id, org_id, business_name)
  VALUES (
    NEW.id,
    new_org_id,
    COALESCE(NEW.raw_user_meta_data->>'isp_name', 'My ISP')
  );

  RETURN NEW;
END;
$$;
