-- Migration: PROPER fix for auth trigger - smart role detection
-- This creates profiles correctly based on user type

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role TEXT[];
  user_name TEXT;
BEGIN
  -- Determine role based on metadata
  IF (NEW.raw_user_meta_data->>'is_student')::boolean = true THEN
    user_role := ARRAY['student']::TEXT[];
  ELSE
    user_role := ARRAY['admin']::TEXT[];
  END IF;
  
  -- Get full name from metadata, fallback to email
  user_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',  -- Check 'name' too
    NEW.email
  );
  
  -- Create profile
  INSERT INTO public.profiles (user_id, email, full_name, role)
  VALUES (NEW.id, NEW.email, user_name, user_role);
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

COMMENT ON FUNCTION public.handle_new_user IS 'Creates profile with correct role (student/admin) based on user metadata';
