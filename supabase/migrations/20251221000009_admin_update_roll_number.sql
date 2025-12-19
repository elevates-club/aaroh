-- Migration: Admin function to update student roll number
-- Created: 2025-12-19

CREATE OR REPLACE FUNCTION admin_update_student_roll_number(
  p_old_roll_number TEXT,
  p_new_roll_number TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_student_id UUID;
  v_user_id UUID;
  v_is_first_login BOOLEAN;
  v_old_email TEXT;
  v_new_email TEXT;
  result JSON;
BEGIN
  -- Check if caller is admin
  IF NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Only admins can update roll numbers';
  END IF;

  -- Get student and user info
  SELECT id, user_id 
  INTO v_student_id, v_user_id
  FROM students 
  WHERE roll_number = p_old_roll_number;

  IF v_student_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Student with roll number ' || p_old_roll_number || ' not found'
    );
  END IF;

  -- Check if new roll number already exists
  IF EXISTS (SELECT 1 FROM students WHERE roll_number = p_new_roll_number) THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Roll number ' || p_new_roll_number || ' already exists'
    );
  END IF;

  -- Get first login status
  SELECT is_first_login INTO v_is_first_login
  FROM profiles
  WHERE user_id = v_user_id;

  -- Build email addresses
  v_old_email := p_old_roll_number || '@ekc.edu.in';
  v_new_email := p_new_roll_number || '@ekc.edu.in';

  -- Update students table
  UPDATE students 
  SET roll_number = p_new_roll_number
  WHERE id = v_student_id;

  -- Update profiles table email (temporary email)
  UPDATE profiles
  SET email = v_new_email
  WHERE user_id = v_user_id
  AND email = v_old_email; -- Only update if still using temp email

  -- Note: auth.users email update needs to be done via admin SDK
  -- Return info for admin to manually update via Supabase dashboard or script

  result := json_build_object(
    'success', true,
    'message', 'Student roll number updated in database',
    'old_roll_number', p_old_roll_number,
    'new_roll_number', p_new_roll_number,
    'user_id', v_user_id,
    'is_first_login', v_is_first_login,
    'old_email', v_old_email,
    'new_email', v_new_email,
    'action_needed', json_build_object(
      'update_auth_email', 'Update email in Authentication > Users from ' || v_old_email || ' to ' || v_new_email,
      'reset_password_if_needed', CASE 
        WHEN v_is_first_login THEN 'Student has not logged in yet. Consider resetting password to: ' || p_new_roll_number
        ELSE 'Student has already changed password. No password reset needed.'
      END
    )
  );

  RETURN result;

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'message', 'Error: ' || SQLERRM
  );
END;
$$;

GRANT EXECUTE ON FUNCTION admin_update_student_roll_number(TEXT, TEXT) TO authenticated;

COMMENT ON FUNCTION admin_update_student_roll_number IS 'Admin function to update student roll number. Updates database, but auth.users email must be updated manually via Supabase dashboard.';
