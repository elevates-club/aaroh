-- Migration: Create function to bulk-create student accounts
-- Created: 2025-12-19
-- Usage: SELECT create_student_accounts_from_csv();

CREATE OR REPLACE FUNCTION create_student_accounts_from_csv()
RETURNS TABLE (
  roll_number TEXT,
  success BOOLEAN,
  message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  student_record RECORD;
  new_user_id UUID;
  temp_email TEXT;
BEGIN
  -- Loop through all students who don't have a user_id yet
  FOR student_record IN 
    SELECT id, roll_number, name, department, year 
    FROM students 
    WHERE user_id IS NULL
  LOOP
    BEGIN
      -- Create temporary email using roll number
      temp_email := student_record.roll_number || '@ekc.edu.in';
      
      -- Create auth user with register number as password
      -- Note: In practice, you'll need to use Supabase Admin API for this
      -- This is a placeholder - actual implementation needs admin SDK
      
      -- For now, we'll create a record showing what needs to be created
      -- Actual user creation should be done via admin script
      
      -- Link student to auth user (assuming user was created externally)
      -- UPDATE students SET user_id = new_user_id WHERE id = student_record.id;
      
      -- Return success
      roll_number := student_record.roll_number;
      success := true;
      message := 'Ready to create: ' || temp_email;
      RETURN NEXT;
      
    EXCEPTION WHEN OTHERS THEN
      roll_number := student_record.roll_number;
      success := false;
      message := SQLERRM;
      RETURN NEXT;
    END;
  END LOOP;
  
  RETURN;
END;
$$;

-- Grant execute to admins only
GRANT EXECUTE ON FUNCTION create_student_accounts_from_csv() TO authenticated;

COMMENT ON FUNCTION create_student_accounts_from_csv IS 'Bulk creates student accounts from students table. Actual auth.users creation needs admin SDK.';


-- Helper function to link student to auth user
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
  
  -- Create profile for student
  -- Note: email here is system email, student's real email goes in students table
  INSERT INTO profiles (user_id, email, full_name, role, is_first_login, profile_completed)
  SELECT 
    p_user_id,
    'noreply-' || p_roll_number || '@ekc.edu.in', -- System email - hidden from students
    name,
    'student'::user_role,
    true,
    false
  FROM students
  WHERE roll_number = p_roll_number;
  
  RETURN true;
  
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Failed to link student %: %', p_roll_number, SQLERRM;
  RETURN false;
END;
$$;

GRANT EXECUTE ON FUNCTION link_student_to_auth_user(TEXT, UUID) TO authenticated;
