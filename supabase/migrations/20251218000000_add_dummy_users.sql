-- Migration to add dummy user credentials for testing
-- This script ensures pgcrypto is available, removes existing dummy users,
-- fixes the trigger function, and inserts users with the CORRECT instance_id.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Fix the public.handle_new_user function to ensure it has the correct search_path
-- and uses fully qualified names.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE((NEW.raw_user_meta_data->>'role')::public.user_role, 'first_year_coordinator')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DO $$
DECLARE
  dummy_password_hash TEXT := crypt('password123', gen_salt('bf'));
  target_instance_id UUID;
BEGIN
  -- 2. Dynamically fetch the instance_id from auth.instances (or auth.users fallback)
  -- This is critical for hosted Supabase projects.
  SELECT id INTO target_instance_id FROM auth.instances LIMIT 1;
  
  -- Fallback if auth.instances is empty (unlikely but possible in some local setups)
  IF target_instance_id IS NULL THEN
     target_instance_id := '00000000-0000-0000-0000-000000000000';
  END IF;

  -- Cleanup existing dummy users
  DELETE FROM auth.users WHERE email IN (
    'admin@sports.com',
    'firstyear@sports.com',
    'secondyear@sports.com',
    'thirdyear@sports.com',
    'fourthyear@sports.com'
  );

  -- Insert Admin
  INSERT INTO auth.users (
    id, instance_id, email, encrypted_password, email_confirmed_at, 
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at, 
    aud, role, is_sso_user
  )
  VALUES (
    gen_random_uuid(),
    target_instance_id,
    'admin@sports.com',
    dummy_password_hash,
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Administrator","role":"admin"}',
    now(),
    now(),
    'authenticated',
    'authenticated',
    false
  );

  -- Insert First Year Coordinator
  INSERT INTO auth.users (
    id, instance_id, email, encrypted_password, email_confirmed_at, 
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at, 
    aud, role, is_sso_user
  )
  VALUES (
    gen_random_uuid(),
    target_instance_id,
    'firstyear@sports.com',
    dummy_password_hash,
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"First Year Coordinator","role":"first_year_coordinator"}',
    now(),
    now(),
    'authenticated',
    'authenticated',
    false
  );

  -- Insert Second Year Coordinator
  INSERT INTO auth.users (
    id, instance_id, email, encrypted_password, email_confirmed_at, 
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at, 
    aud, role, is_sso_user
  )
  VALUES (
    gen_random_uuid(),
    target_instance_id,
    'secondyear@sports.com',
    dummy_password_hash,
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Second Year Coordinator","role":"second_year_coordinator"}',
    now(),
    now(),
    'authenticated',
    'authenticated',
    false
  );

  -- Insert Third Year Coordinator
  INSERT INTO auth.users (
    id, instance_id, email, encrypted_password, email_confirmed_at, 
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at, 
    aud, role, is_sso_user
  )
  VALUES (
    gen_random_uuid(),
    target_instance_id,
    'thirdyear@sports.com',
    dummy_password_hash,
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Third Year Coordinator","role":"third_year_coordinator"}',
    now(),
    now(),
    'authenticated',
    'authenticated',
    false
  );

  -- Insert Fourth Year Coordinator
  INSERT INTO auth.users (
    id, instance_id, email, encrypted_password, email_confirmed_at, 
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at, 
    aud, role, is_sso_user
  )
  VALUES (
    gen_random_uuid(),
    target_instance_id,
    'fourthyear@sports.com',
    dummy_password_hash,
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Fourth Year Coordinator","role":"fourth_year_coordinator"}',
    now(),
    now(),
    'authenticated',
    'authenticated',
    false
  );

END $$;
