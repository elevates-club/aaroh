-- Fix RPCs for User Management
-- 1. Rename parameters to avoid ambiguity
-- 2. Allow Event Managers to create/delete users (with restrictions)

-- Drop existing functions to allow signature changes (renaming parameters)
DROP FUNCTION IF EXISTS public.create_user_by_admin(TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.delete_user_by_admin(UUID);

-- Fix create_user_by_admin
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
  -- Get caller roles
  SELECT role INTO caller_role FROM public.profiles WHERE id = auth.uid();
  
  -- Determine permissions
  caller_is_admin := caller_role @> ARRAY['admin'] OR caller_role @> '{"admin"}';
  caller_is_manager := caller_role @> ARRAY['event_manager'] OR caller_role @> '{"event_manager"}';

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

-- Fix delete_user_by_admin
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
  -- Get caller roles
  SELECT role INTO caller_role FROM public.profiles WHERE id = auth.uid();
  
  caller_is_admin := caller_role @> ARRAY['admin'] OR caller_role @> '{"admin"}';
  caller_is_manager := caller_role @> ARRAY['event_manager'] OR caller_role @> '{"event_manager"}';

  IF NOT (caller_is_admin OR caller_is_manager) THEN
    RETURN jsonb_build_object('error', 'Unauthorized: Insufficient permissions');
  END IF;

  -- Restriction: Event Managers cannot delete Admins
  IF caller_is_manager AND NOT caller_is_admin THEN
    SELECT role INTO target_user_role FROM public.profiles WHERE id = target_user_id;
    IF target_user_role @> ARRAY['admin'] OR target_user_role @> '{"admin"}' THEN
       RETURN jsonb_build_object('error', 'Unauthorized: Event Managers cannot delete Admin accounts');
    END IF;
  END IF;

  DELETE FROM auth.users WHERE id = target_user_id;

  RETURN jsonb_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('error', SQLERRM);
END;
$$;
