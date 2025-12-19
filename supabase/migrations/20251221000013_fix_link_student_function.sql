-- Migration: Fix link_student_to_auth_user function for multi-role array
-- This fixes the AuthApiError when creating student accounts

DROP FUNCTION IF EXISTS link_student_to_auth_user(TEXT, UUID);

CREATE OR REPLACE FUNCTION link_student_to_auth_user(
  p_roll_number TEXT,
  p_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update student record with user_id
  UPDATE students 
  SET user_id = p_user_id 
  WHERE roll_number = p_roll_number;
  
  -- Update profile created by trigger (don't create duplicate)
  -- Just ensure it has student role
  UPDATE profiles
  SET role = ARRAY['student']::TEXT[],
      is_first_login = true,
      profile_completed = false
  WHERE user_id = p_user_id;
  
  RETURN true;
  
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Failed to link student %: %', p_roll_number, SQLERRM;
  RETURN false;
END;
$$;

GRANT EXECUTE ON FUNCTION link_student_to_auth_user(TEXT, UUID) TO authenticated;

COMMENT ON FUNCTION link_student_to_auth_user IS 'Links student to auth user and creates profile with student role array';
