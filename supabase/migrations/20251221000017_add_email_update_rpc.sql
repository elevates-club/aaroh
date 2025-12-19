-- Create a secure function to update auth email directly
-- useful when the user cannot verify the old email (e.g. noreply placeholder)
DROP FUNCTION IF EXISTS public.update_student_auth_email(UUID, TEXT);
CREATE OR REPLACE FUNCTION public.update_student_auth_email(p_user_id UUID, p_new_email TEXT)
RETURNS JSONB AS $$
DECLARE
  v_old_email TEXT;
BEGIN
  -- Check if user exists
  SELECT email INTO v_old_email FROM auth.users WHERE id = p_user_id;
  
  IF v_old_email IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'User not found');
  END IF;

  -- Update the email directly in auth.users
  -- This bypasses the need for "old email confirmation"
  UPDATE auth.users
  SET email = p_new_email,
      email_confirmed_at = now(), -- Auto-confirm the new email
      updated_at = now()
  WHERE id = p_user_id;

  RETURN jsonb_build_object('success', true, 'message', 'Email updated successfully');
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.update_student_auth_email(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_student_auth_email(UUID, TEXT) TO service_role;
