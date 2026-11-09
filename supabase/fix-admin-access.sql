-- ====================================================================
-- NextGen Learning Platform - Fix Admin Access Script
-- Run this in your Supabase SQL Editor (Dashboard -> SQL Editor)
-- ====================================================================

-- 1. Fix the role protection trigger so that database administrators (in SQL console)
--    can freely promote or assign roles without being blocked by auth.uid() checks.
CREATE OR REPLACE FUNCTION public.protect_profile_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    -- Allow role change if:
    -- 1. Executed directly in DB console / migrations (auth.uid() IS NULL or current_user is postgres / service_role)
    -- 2. OR caller has service_role JWT
    -- 3. OR the authenticated user is already an admin
    IF auth.uid() IS NULL 
       OR current_user IN ('postgres', 'service_role', 'supabase_admin')
       OR (auth.jwt()->>'role') = 'service_role'
       OR public.is_admin() THEN
      NULL; -- Allowed
    ELSE
      -- Disallow normal students from escalating their own role
      NEW.role := OLD.role;
    END IF;
  END IF;

  NEW.updated_at := timezone('utc'::text, now());
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_protect_profile_role ON public.profiles;
CREATE TRIGGER tr_protect_profile_role
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_profile_role();

-- 2. Re-create or ensure the default Admin account exists and has confirmed email
--    Credentials: admin@nextgen.com / NextGenAdmin@123
DELETE FROM auth.users WHERE email = 'admin@nextgen.com';

INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change,
  email_change_token_current,
  phone_change,
  phone_change_token,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'admin@nextgen.com',
  extensions.crypt('NextGenAdmin@123', extensions.gen_salt('bf')),
  timezone('utc'::text, now()),
  '',
  '',
  '',
  '',
  '',
  '',
  '',
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"full_name":"NextGen Administrator"}'::jsonb,
  timezone('utc'::text, now()),
  timezone('utc'::text, now())
);

-- 3. Elevate default admin to 'admin'
UPDATE public.profiles
SET role = 'admin'
WHERE email = 'admin@nextgen.com';

-- 4. (OPTIONAL) If you registered your own account and want it to be Admin,
--    uncomment and replace with your own email or phone below:
-- UPDATE public.profiles SET role = 'admin' WHERE email = 'YOUR_EMAIL@EXAMPLE.COM';
-- UPDATE public.profiles SET role = 'admin' WHERE phone = '+91XXXXXXXXXX';

-- 5. Force schema cache reload
NOTIFY pgrst, 'reload schema';

-- Verification query: Verify admin accounts
SELECT id, full_name, email, phone, role, created_at 
FROM public.profiles 
WHERE role = 'admin';
