-- Function to get login email by roll number
-- Allows users to login with Roll Number even after changing their email
CREATE OR REPLACE FUNCTION public.get_student_login_email(p_roll_number TEXT)
RETURNS TEXT AS $$
DECLARE
  v_user_id UUID;
  v_email TEXT;
  v_student_roll TEXT;
BEGIN
  -- Normalize roll number input (uppercase)
  v_student_roll := UPPER(p_roll_number);

  -- 1. Find the User ID linked to this student
  SELECT user_id INTO v_user_id
  FROM public.students
  WHERE roll_number = v_student_roll;
  
  IF v_user_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- 2. Get the email from auth.users
  SELECT email INTO v_email
  FROM auth.users
  WHERE id = v_user_id;

  RETURN v_email;
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant access to anonymous users (so they can lookup email during login)
GRANT EXECUTE ON FUNCTION public.get_student_login_email(TEXT) TO anon, authenticated, service_role;
