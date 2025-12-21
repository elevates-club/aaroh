-- Migration: Fix RLS recursion and activity logs viewing
-- 1. Fix Profiles RLS recursion
-- 2. Fix Activity Logs RLS for user access
-- 3. Fix Admin RPCs (id vs user_id)

-- 0. Defensive check: Ensure public.profiles has user_id
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name='profiles' AND column_name='user_id') THEN
        RAISE NOTICE 'Adding missing user_id column to profiles table...';
        ALTER TABLE public.profiles ADD COLUMN user_id UUID REFERENCES auth.users(id);
        
        -- Logic: If profiles.id is already a valid auth.users.id, sync it
        -- Most common scenario when user_id is missing
        UPDATE public.profiles SET user_id = id;
        
        ALTER TABLE public.profiles ALTER COLUMN user_id SET NOT NULL;
        ALTER TABLE public.profiles ADD CONSTRAINT profiles_user_id_key UNIQUE (user_id);
    END IF;
END $$;

-- 0.1 Defensive check: Ensure public.activity_logs has user_id
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name='activity_logs' AND column_name='user_id') THEN
        RAISE NOTICE 'Adding missing user_id column to activity_logs table...';
        ALTER TABLE public.activity_logs ADD COLUMN user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 1. Fix Profiles Policies
DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can read their own profile" ON public.profiles;

CREATE POLICY "Users can read their own profile"
ON public.profiles FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all profiles"
ON public.profiles FOR ALL
USING (
  (SELECT role FROM public.profiles WHERE user_id = auth.uid()) @> ARRAY['admin']
);

-- 2. Fix Activity Logs Policies
DROP POLICY IF EXISTS "Users can read their own activity" ON public.activity_logs;
DROP POLICY IF EXISTS "Admins can read all activity" ON public.activity_logs;

-- Refine get_client_ip for more robust capture
CREATE OR REPLACE FUNCTION public.get_client_ip()
RETURNS INET AS $$
BEGIN
  -- Try to get IP from various common headers directly
  RETURN COALESCE(
    inet(nullif(current_setting('request.headers.x-forwarded-for', true), '')),
    inet(nullif(current_setting('request.headers.x-real-ip', true), '')),
    inet(nullif(current_setting('request.headers.cf-connecting-ip', true), '')),
    inet(nullif(current_setting('request.headers.x-client-ip', true), '')),
    '127.0.0.1'::INET
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN '127.0.0.1'::INET;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Capture IP/UA automatically if not provided
CREATE OR REPLACE FUNCTION public.handle_activity_log_metadata()
RETURNS TRIGGER AS $$
BEGIN
  -- Always set created_at just in case
  IF NEW.created_at IS NULL THEN
    NEW.created_at := now();
  END IF;

  -- Determine IP
  IF NEW.ip_address IS NULL OR NEW.ip_address = '0.0.0.0'::INET THEN
    NEW.ip_address := public.get_client_ip();
  END IF;
  
  -- Determine User Agent
  IF NEW.user_agent IS NULL OR NEW.user_agent = '' OR NEW.user_agent = 'Server/Unknown' THEN
    BEGIN
      NEW.user_agent := nullif(current_setting('request.headers.user-agent', true), '');
    EXCEPTION WHEN OTHERS THEN
      -- Fall through
    END;
    
    -- Final fallback if still empty
    IF NEW.user_agent IS NULL OR NEW.user_agent = '' THEN
      NEW.user_agent := 'Unknown';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_activity_log_insert ON public.activity_logs;
CREATE TRIGGER on_activity_log_insert
  BEFORE INSERT ON public.activity_logs
  FOR EACH ROW EXECUTE FUNCTION public.handle_activity_log_metadata();

-- Activity logs user_id is profiles.id
CREATE POLICY "Users can read their own activity"
ON public.activity_logs FOR SELECT
USING (
  user_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
);

CREATE POLICY "Admins can read all activity"
ON public.activity_logs FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid()
    AND role @> ARRAY['admin']
  )
);

CREATE POLICY "Users can insert their own activity"
ON public.activity_logs FOR INSERT
WITH CHECK (
  user_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
);

-- 3. Fix Admin RPCs (Check user_id instead of id against auth.uid())
CREATE OR REPLACE FUNCTION public.create_user_by_admin(
  p_email TEXT,
  p_password TEXT,
  p_full_name TEXT,
  p_role TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth 
AS $$
DECLARE
  new_user_id UUID;
  encrypted_pw TEXT;
  caller_role TEXT[];
  caller_is_admin BOOLEAN;
  caller_is_manager BOOLEAN;
BEGIN
  -- FIX: Check user_id = auth.uid() instead of id = auth.uid()
  SELECT role INTO caller_role FROM public.profiles WHERE user_id = auth.uid();
  
  -- Determine permissions
  caller_is_admin := caller_role @> ARRAY['admin'];
  caller_is_manager := caller_role @> ARRAY['event_manager'];

  IF NOT (caller_is_admin OR caller_is_manager) THEN
    RETURN jsonb_build_object('error', 'Unauthorized: Insufficient permissions');
  END IF;

  -- Restriction: Event Managers cannot create Admins
  IF caller_is_manager AND NOT caller_is_admin THEN
    IF p_role = 'admin' OR p_role ILIKE '%admin%' THEN 
      RETURN jsonb_build_object('error', 'Unauthorized: Event Managers cannot create Admin accounts');
    END IF;
  END IF;

  -- Hash password
  encrypted_pw := crypt(p_password, gen_salt('bf'));

  -- Insert into auth.users
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    p_email,
    encrypted_pw,
    now(),
    '{"provider": "email", "providers": ["email"]}',
    jsonb_build_object(
      'full_name', p_full_name,
      'role', p_role
    ),
    now(),
    now(),
    '',
    ''
  ) RETURNING id INTO new_user_id;

  RETURN jsonb_build_object('success', true, 'user_id', new_user_id);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('error', SQLERRM);
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_user_by_admin(target_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth 
AS $$
DECLARE
  caller_role TEXT[];
  caller_is_admin BOOLEAN;
  caller_is_manager BOOLEAN;
  target_user_role TEXT[];
BEGIN
  -- FIX: Check user_id = auth.uid() instead of id = auth.uid()
  SELECT role INTO caller_role FROM public.profiles WHERE user_id = auth.uid();
  
  caller_is_admin := caller_role @> ARRAY['admin'];
  caller_is_manager := caller_role @> ARRAY['event_manager'];

  IF NOT (caller_is_admin OR caller_is_manager) THEN
    RETURN jsonb_build_object('error', 'Unauthorized: Insufficient permissions');
  END IF;

  -- Restriction: Event Managers cannot delete Admins
  IF caller_is_manager AND NOT caller_is_admin THEN
    SELECT role INTO target_user_role FROM public.profiles WHERE user_id = target_user_id; -- target_user_id is auth.users.id
    IF target_user_role @> ARRAY['admin'] THEN
       RETURN jsonb_build_object('error', 'Unauthorized: Event Managers cannot delete Admin accounts');
    END IF;
  END IF;

  DELETE FROM auth.users WHERE id = target_user_id;

  RETURN jsonb_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('error', SQLERRM);
END;
$$;

-- Drop first to avoid "cannot change return type" errors if previously defined differently
DROP FUNCTION IF EXISTS public.log_user_login(uuid, text, jsonb);
DROP FUNCTION IF EXISTS public.log_user_logout(uuid, uuid);

-- Refine log_user_login to ensure it uses the metadata trigger or robust IP capture
CREATE OR REPLACE FUNCTION public.log_user_login(
  p_user_id UUID,
  p_action TEXT DEFAULT 'user_login',
  p_details JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO public.activity_logs (
    user_id, 
    action, 
    details
  )
  VALUES (
    p_user_id,
    p_action,
    COALESCE(p_details, '{}'::jsonb)
  )
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Refine log_user_logout to ensure it uses the metadata trigger or robust IP capture
CREATE OR REPLACE FUNCTION public.log_user_logout(
  p_user_id UUID,
  p_session_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO public.activity_logs (
    user_id, 
    action, 
    details
  )
  VALUES (
    p_user_id,
    'user_logout',
    jsonb_build_object('session_id', p_session_id)
  )
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
