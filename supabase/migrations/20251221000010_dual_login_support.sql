-- Migration: Function to update auth email when student completes profile
-- Created: 2025-12-19
-- This allows students to login with their real email after profile setup

CREATE OR REPLACE FUNCTION update_student_auth_email(
  p_user_id UUID,
  p_new_email TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_roll_number TEXT;
  result JSON;
BEGIN
  -- Get student's roll number
  SELECT roll_number INTO v_roll_number
  FROM students
  WHERE user_id = p_user_id;

  IF v_roll_number IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Student not found'
    );
  END IF;

  -- Validate email format
  IF p_new_email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Invalid email format'
    );
  END IF;

  -- Update students table
  UPDATE students
  SET email = p_new_email
  WHERE user_id = p_user_id;

  -- Update profiles table
  UPDATE profiles
  SET 
    email = p_new_email,
    profile_completed = true
  WHERE user_id = p_user_id;

  -- Note: auth.users email must be updated via admin SDK
  -- Frontend will call Supabase admin API to update email

  RETURN json_build_object(
    'success', true,
    'message', 'Email updated successfully',
    'roll_number', v_roll_number,
    'new_email', p_new_email,
    'user_id', p_user_id
  );

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'message', 'Error: ' || SQLERRM
  );
END;
$$;

GRANT EXECUTE ON FUNCTION update_student_auth_email(UUID, TEXT) TO authenticated;

COMMENT ON FUNCTION update_student_auth_email IS 'Updates student email in students and profiles tables. Auth email must be updated separately via admin SDK.';


-- Function to check if email already exists
CREATE OR REPLACE FUNCTION check_email_availability(p_email TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if email exists in students table
  RETURN NOT EXISTS (
    SELECT 1 FROM students WHERE email = p_email
  );
END;
$$;

GRANT EXECUTE ON FUNCTION check_email_availability(TEXT) TO authenticated;
