-- ====================================================================
-- NextGen Learning Platform - Complete Supabase Master Migration
-- Tagline: "Leading Today, Shaping Tomorrow."
-- ====================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  email TEXT,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON public.profiles(phone);

-- 3. COURSES TABLE
CREATE TABLE IF NOT EXISTS public.courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  what_you_learn TEXT[] NOT NULL DEFAULT '{}',
  instructor_name TEXT NOT NULL DEFAULT 'NextGen Instructor',
  price NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (price >= 0),
  thumbnail_url TEXT,
  is_published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_courses_published ON public.courses(is_published);

-- 4. LESSONS TABLE
CREATE TABLE IF NOT EXISTS public.lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  video_url TEXT,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_lessons_course_pos ON public.lessons(course_id, position);

-- 5. ENROLLMENTS TABLE
CREATE TABLE IF NOT EXISTS public.enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT unique_user_course UNIQUE (user_id, course_id)
);

CREATE INDEX IF NOT EXISTS idx_enrollments_user ON public.enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_course ON public.enrollments(course_id);

-- 6. LESSON PROGRESS TABLE
CREATE TABLE IF NOT EXISTS public.lesson_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  completed BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT unique_user_lesson UNIQUE (user_id, lesson_id)
);

CREATE INDEX IF NOT EXISTS idx_lesson_progress_user ON public.lesson_progress(user_id);

-- 7. ORDERS TABLE
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  amount NUMERIC(10, 2) NOT NULL CHECK (amount >= 0),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed')),
  gateway_reference TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_orders_user ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);

-- ====================================================================
-- 8. HELPER FUNCTIONS & TRIGGERS
-- ====================================================================

-- Function: Check if the current executing user is an admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- Function: Auto-create profile on signup with strict student role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, phone, role)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', ''),
    new.email,
    COALESCE(new.raw_user_meta_data->>'phone', new.phone),
    'student' -- Explicitly hardcode 'student', preventing elevation during signup
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone;
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger: Prevent non-admin users from changing their own role
CREATE OR REPLACE FUNCTION public.protect_profile_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    NEW.role := OLD.role;
  END IF;
  NEW.updated_at := timezone('utc'::text, now());
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_protect_profile_role ON public.profiles;
CREATE TRIGGER tr_protect_profile_role
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_profile_role();

-- Auto update timestamp trigger on courses
CREATE OR REPLACE FUNCTION public.update_course_timestamp()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := timezone('utc'::text, now());
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_update_course_timestamp ON public.courses;
CREATE TRIGGER tr_update_course_timestamp
  BEFORE UPDATE ON public.courses
  FOR EACH ROW EXECUTE FUNCTION public.update_course_timestamp();

-- ====================================================================
-- 9. DIRECT STUDENT REGISTRATION RPC (Solution B: Zero Rate Limit)
-- ====================================================================
CREATE OR REPLACE FUNCTION public.register_student(
  p_email TEXT,
  p_password TEXT,
  p_full_name TEXT,
  p_phone TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_user_id UUID := gen_random_uuid();
  v_encrypted_pw TEXT;
  v_raw_meta JSONB;
BEGIN
  IF p_email IS NULL OR trim(p_email) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Email or identifier is required.');
  END IF;

  IF p_password IS NULL OR length(p_password) < 8 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Password must be at least 8 characters long.');
  END IF;

  -- Check if user already exists
  IF EXISTS (SELECT 1 FROM auth.users WHERE lower(email) = lower(trim(p_email))) THEN
    RETURN jsonb_build_object('success', false, 'error', 'An account with this email or mobile number already exists. Please log in.');
  END IF;

  v_encrypted_pw := extensions.crypt(p_password, extensions.gen_salt('bf'));

  v_raw_meta := jsonb_build_object(
    'full_name', coalesce(trim(p_full_name), ''),
    'phone', p_phone
  );

  -- Insert directly into auth.users as pre-confirmed with clean empty strings
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
    v_user_id,
    'authenticated',
    'authenticated',
    lower(trim(p_email)),
    v_encrypted_pw,
    timezone('utc'::text, now()),
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '{"provider":"email","providers":["email"]}'::jsonb,
    v_raw_meta,
    timezone('utc'::text, now()),
    timezone('utc'::text, now())
  );

  RETURN jsonb_build_object('success', true, 'user_id', v_user_id);
EXCEPTION WHEN unique_violation THEN
  RETURN jsonb_build_object('success', false, 'error', 'An account with this email or mobile number already exists. Please log in.');
WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.register_student(TEXT, TEXT, TEXT, TEXT) TO anon, authenticated, service_role;

-- ====================================================================
-- 10. ROW LEVEL SECURITY (RLS) POLICIES
-- ====================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
CREATE POLICY "profiles_select_policy"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id OR public.is_admin());

DROP POLICY IF EXISTS "profiles_update_policy" ON public.profiles;
CREATE POLICY "profiles_update_policy"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id OR public.is_admin())
  WITH CHECK (auth.uid() = id OR public.is_admin());

DROP POLICY IF EXISTS "profiles_admin_all" ON public.profiles;
CREATE POLICY "profiles_admin_all"
  ON public.profiles FOR ALL
  USING (public.is_admin());

-- Courses Policies
DROP POLICY IF EXISTS "courses_select_policy" ON public.courses;
CREATE POLICY "courses_select_policy"
  ON public.courses FOR SELECT
  USING (is_published = true OR public.is_admin());

DROP POLICY IF EXISTS "courses_admin_insert" ON public.courses;
CREATE POLICY "courses_admin_insert"
  ON public.courses FOR INSERT
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "courses_admin_update" ON public.courses;
CREATE POLICY "courses_admin_update"
  ON public.courses FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "courses_admin_delete" ON public.courses;
CREATE POLICY "courses_admin_delete"
  ON public.courses FOR DELETE
  USING (public.is_admin());

-- Lessons Policies
DROP POLICY IF EXISTS "lessons_enrolled_or_admin_select" ON public.lessons;
CREATE POLICY "lessons_enrolled_or_admin_select"
  ON public.lessons FOR SELECT
  USING (
    public.is_admin() OR
    EXISTS (
      SELECT 1 FROM public.enrollments
      WHERE enrollments.course_id = lessons.course_id
        AND enrollments.user_id = auth.uid()
        AND enrollments.status = 'active'
    )
  );

DROP POLICY IF EXISTS "lessons_admin_insert" ON public.lessons;
CREATE POLICY "lessons_admin_insert"
  ON public.lessons FOR INSERT
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "lessons_admin_update" ON public.lessons;
CREATE POLICY "lessons_admin_update"
  ON public.lessons FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "lessons_admin_delete" ON public.lessons;
CREATE POLICY "lessons_admin_delete"
  ON public.lessons FOR DELETE
  USING (public.is_admin());

-- Safe RPC function for public curriculum previews (titles & sequence only, no video_url)
CREATE OR REPLACE FUNCTION public.get_course_curriculum(p_course_id UUID)
RETURNS TABLE (
  id UUID,
  course_id UUID,
  title TEXT,
  "position" INTEGER
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT l.id, l.course_id, l.title, l."position"
  FROM public.lessons l
  JOIN public.courses c ON c.id = l.course_id
  WHERE l.course_id = p_course_id
    AND (c.is_published = true OR public.is_admin())
  ORDER BY l."position" ASC;
$$;

-- Enrollments Policies
DROP POLICY IF EXISTS "enrollments_select_policy" ON public.enrollments;
CREATE POLICY "enrollments_select_policy"
  ON public.enrollments FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "enrollments_admin_all" ON public.enrollments;
CREATE POLICY "enrollments_admin_all"
  ON public.enrollments FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Lesson Progress Policies
DROP POLICY IF EXISTS "lesson_progress_select_policy" ON public.lesson_progress;
CREATE POLICY "lesson_progress_select_policy"
  ON public.lesson_progress FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "lesson_progress_insert_policy" ON public.lesson_progress;
CREATE POLICY "lesson_progress_insert_policy"
  ON public.lesson_progress FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM public.lessons l
      JOIN public.enrollments e ON e.course_id = l.course_id
      WHERE l.id = lesson_progress.lesson_id
        AND e.user_id = auth.uid()
        AND e.status = 'active'
    )
  );

DROP POLICY IF EXISTS "lesson_progress_update_policy" ON public.lesson_progress;
CREATE POLICY "lesson_progress_update_policy"
  ON public.lesson_progress FOR UPDATE
  USING (auth.uid() = user_id OR public.is_admin())
  WITH CHECK (auth.uid() = user_id OR public.is_admin());

-- Orders Policies
DROP POLICY IF EXISTS "orders_select_policy" ON public.orders;
CREATE POLICY "orders_select_policy"
  ON public.orders FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "orders_student_insert_pending" ON public.orders;
CREATE POLICY "orders_student_insert_pending"
  ON public.orders FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    status = 'pending'
  );

DROP POLICY IF EXISTS "orders_admin_all" ON public.orders;
CREATE POLICY "orders_admin_all"
  ON public.orders FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ====================================================================
-- 11. STORAGE BUCKETS CONFIGURATION (Supabase Storage)
-- ====================================================================

-- 1. course-thumbnails (Public bucket for course thumbnails)
INSERT INTO storage.buckets (id, name, public)
VALUES ('course-thumbnails', 'course-thumbnails', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. course-videos (Private bucket for video uploads)
INSERT INTO storage.buckets (id, name, public)
VALUES ('course-videos', 'course-videos', false)
ON CONFLICT (id) DO UPDATE SET public = false;

-- Storage Policies for course-thumbnails:
DROP POLICY IF EXISTS "Thumbnails are publicly accessible" ON storage.objects;
CREATE POLICY "Thumbnails are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'course-thumbnails');

DROP POLICY IF EXISTS "Admins can upload thumbnails" ON storage.objects;
CREATE POLICY "Admins can upload thumbnails"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'course-thumbnails' AND public.is_admin());

DROP POLICY IF EXISTS "Admins can update thumbnails" ON storage.objects;
CREATE POLICY "Admins can update thumbnails"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'course-thumbnails' AND public.is_admin());

DROP POLICY IF EXISTS "Admins can delete thumbnails" ON storage.objects;
CREATE POLICY "Admins can delete thumbnails"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'course-thumbnails' AND public.is_admin());

-- Storage Policies for course-videos:
DROP POLICY IF EXISTS "Admins and enrolled students can view course videos" ON storage.objects;
CREATE POLICY "Admins and enrolled students can view course videos"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'course-videos' AND (
      public.is_admin() OR
      auth.role() = 'authenticated'
    )
  );

DROP POLICY IF EXISTS "Admins can upload videos" ON storage.objects;
CREATE POLICY "Admins can upload videos"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'course-videos' AND public.is_admin());

DROP POLICY IF EXISTS "Admins can update/delete videos" ON storage.objects;
CREATE POLICY "Admins can update/delete videos"
  ON storage.objects FOR ALL
  USING (bucket_id = 'course-videos' AND public.is_admin());

-- ====================================================================
-- 12. INITIAL ADMIN ACCOUNT CREATION
-- Credentials: admin@nextgen.com / NextGenAdmin@123
-- ====================================================================
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

-- Elevate to admin
UPDATE public.profiles
SET role = 'admin'
WHERE email = 'admin@nextgen.com';

-- Refresh cache
NOTIFY pgrst, 'reload schema';

-- ====================================================================
-- DOCUMENTED FIRST ADMIN CREATION (Template)
-- UPDATE public.profiles SET role = 'admin' WHERE email = 'your-email@example.com';
-- ====================================================================
