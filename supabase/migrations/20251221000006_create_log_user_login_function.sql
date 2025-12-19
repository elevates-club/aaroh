-- Migration: Create log_user_login function for activity logging
-- Created: 2025-12-19

-- Create the log_user_login function
CREATE OR REPLACE FUNCTION log_user_login(
  p_user_id UUID,
  p_action TEXT,
  p_details JSONB DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Insert activity log entry
  INSERT INTO activity_logs (user_id, action, details)
  VALUES (p_user_id, p_action, p_details);
  
EXCEPTION
  WHEN OTHERS THEN
    -- Silently fail if activity logging fails
    -- Don't break the login flow
    RAISE WARNING 'Failed to log user login: %', SQLERRM;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION log_user_login(UUID, TEXT, JSONB) TO authenticated;

-- Add comment
COMMENT ON FUNCTION log_user_login IS 'Logs user login activity to activity_logs table';
