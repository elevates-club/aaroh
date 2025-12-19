-- Create a secure function to update first_login status
-- Bypasses RLS to ensure the flag is correctly set
CREATE OR REPLACE FUNCTION public.complete_first_login(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.profiles
  SET is_first_login = false,
      updated_at = NOW()
  WHERE id = p_user_id; -- Profile ID and User ID are same in this schema? Checking...
  -- Wait, schema says: id UUID PRIMARY KEY (gen_random_uuid), user_id UUID REFERENCES auth.users
  -- The previous code used .eq('id', profile.id). 
  -- IF profile.id is the UUID of the profile row, that's correct.
  -- IF we pass user_id, we should update where user_id = p_user_id.
  -- Safe bet: Update where user_id = p_user_id.
  
  -- Let's check schema quick:
  -- profiles (id, user_id, ...)
  -- My new function will accept user_id (auth.uid) and update based on that.
  
  -- Re-writing body:
  UPDATE public.profiles
  SET is_first_login = false,
      updated_at = NOW()
  WHERE user_id = p_user_id;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.complete_first_login(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_first_login(UUID) TO service_role;
