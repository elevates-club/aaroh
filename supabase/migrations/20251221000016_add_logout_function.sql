-- Create log_user_logout function
CREATE OR REPLACE FUNCTION public.log_user_logout(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
  INSERT INTO public.activity_logs (user_id, action, details)
  VALUES (p_user_id, 'logout', '{}'::JSONB);
EXCEPTION WHEN OTHERS THEN
  -- Do nothing on error to prevent blocking auth flow
  NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.log_user_logout(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_user_logout(UUID) TO service_role;
