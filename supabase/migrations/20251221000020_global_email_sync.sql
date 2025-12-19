-- =====================================================
-- GLOBAL EMAIL SYNC SOLUTION
-- This migration ensures profiles.email stays in sync
-- with auth.users.email for all student accounts.
-- =====================================================

-- =====================================================
-- PART 1: ONE-TIME SYNC (Run this first)
-- Syncs all existing profiles with their auth.users email
-- =====================================================

UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE p.user_id = u.id
  AND p.email != u.email;

-- Verify sync
SELECT 
  p.id as profile_id,
  p.email as profile_email,
  u.email as auth_email,
  CASE WHEN p.email = u.email THEN '✅ Synced' ELSE '❌ Mismatch' END as status
FROM public.profiles p
JOIN auth.users u ON p.user_id = u.id
WHERE p.email LIKE 'noreply-%';

-- =====================================================
-- PART 2: AUTOMATIC TRIGGER (For future changes)
-- Syncs profiles.email whenever auth.users.email changes
-- =====================================================

CREATE OR REPLACE FUNCTION public.sync_profile_email()
RETURNS TRIGGER AS $$
BEGIN
  -- Only update if email actually changed
  IF OLD.email IS DISTINCT FROM NEW.email THEN
    UPDATE public.profiles
    SET email = NEW.email,
        updated_at = NOW()
    WHERE user_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if any
DROP TRIGGER IF EXISTS sync_profile_email_on_auth_update ON auth.users;

-- Create the trigger
CREATE TRIGGER sync_profile_email_on_auth_update
AFTER UPDATE OF email ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.sync_profile_email();

-- =====================================================
-- VERIFICATION: Check remaining noreply emails
-- =====================================================

SELECT COUNT(*) as remaining_noreply_emails
FROM public.profiles
WHERE email LIKE 'noreply-%';
