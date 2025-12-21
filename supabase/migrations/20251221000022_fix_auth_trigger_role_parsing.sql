-- Migration: Fix auth trigger to respect role metadata and prevent unsafe defaults
-- Supersedes 20251221000015_smart_auth_trigger.sql

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role TEXT[];
  user_name TEXT;
  meta_role TEXT;
BEGIN
  -- Get role from metadata
  meta_role := NEW.raw_user_meta_data->>'role';

  -- Logic to determine role
  IF meta_role IS NULL THEN
    -- Fallback: Check legacy is_student flag
    IF (NEW.raw_user_meta_data->>'is_student')::boolean = true THEN
       user_role := ARRAY['student']::TEXT[];
    ELSE
       -- SAFETY FIX: Default to student instead of admin
       user_role := ARRAY['student']::TEXT[]; 
    END IF;
  ELSIF meta_role = 'admin' THEN
    -- SECURITY FIX: explicitly block 'admin' signup request -> downgrade to student
    user_role := ARRAY['student']::TEXT[];
  ELSE
    -- Accept valid provided roles (e.g., event_manager, coordinator)
    user_role := ARRAY[meta_role]::TEXT[];
  END IF;
  
  -- Get full name from metadata, fallback to email
  user_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    NEW.email
  );
  
  -- Create profile
  INSERT INTO public.profiles (user_id, email, full_name, role)
  VALUES (NEW.id, NEW.email, user_name, user_role);
  
  RETURN NEW;
END;
$$;
