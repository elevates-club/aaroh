-- Migration: Admin User Management Fixes
-- 1. Enable pgcrypto for password hashing
-- 2. Fix activity_logs foreign key for ON DELETE CASCADE
-- 3. Add create_user_by_admin RPC for server-side user creation

-- 1. Enable pgcrypto
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Fix Deletion Constraint
ALTER TABLE public.activity_logs
DROP CONSTRAINT IF EXISTS activity_logs_user_id_fkey,
ADD CONSTRAINT activity_logs_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES public.profiles(id)
  ON DELETE CASCADE;

-- 3. Add Admin User Creation RPC
CREATE OR REPLACE FUNCTION public.create_user_by_admin(
  email TEXT,
  password TEXT,
  full_name TEXT,
  role TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth 
AS $$
DECLARE
  new_user_id UUID;
  encrypted_pw TEXT;
  user_role TEXT;
BEGIN
  -- Check if executing user is an admin
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() 
    AND (
      role @> '{"admin"}' OR 
      role = '{"admin"}' OR 
      role::text[] @> ARRAY['admin']
    )
  ) THEN
    RETURN jsonb_build_object('error', 'Unauthorized: Only admins can create users');
  END IF;

  -- Hash password
  encrypted_pw := crypt(password, gen_salt('bf'));

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
    'authenticated', -- Supabase auth role
    email,
    encrypted_pw,
    now(), -- Auto confirm email
    '{"provider": "email", "providers": ["email"]}',
    jsonb_build_object(
      'full_name', full_name,
      'role', role
    ),
    now(),
    now(),
    '',
    ''
  ) RETURNING id INTO new_user_id;

  -- The trigger 'on_auth_user_created' (from previous migration) 
  -- will automatically create the public.profile entry.

  RETURN jsonb_build_object('success', true, 'user_id', new_user_id);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('error', SQLERRM);
END;
$$;

-- 4. Add Admin User Deletion RPC
CREATE OR REPLACE FUNCTION public.delete_user_by_admin(target_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth 
AS $$
BEGIN
  -- Check if executing user is an admin
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() 
    AND (
      role @> '{"admin"}' OR 
      role = '{"admin"}' OR 
      role::text[] @> ARRAY['admin']
    )
  ) THEN
    RETURN jsonb_build_object('error', 'Unauthorized: Only admins can delete users');
  END IF;

  -- Delete from auth.users (Cascades to public.profiles)
  DELETE FROM auth.users WHERE id = target_user_id;

  RETURN jsonb_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('error', SQLERRM);
END;
$$;
