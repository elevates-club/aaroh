-- COMPREHENSIVE FIX FOR ACTIVITY LOGS
-- Run this entire script in your Supabase SQL Editor

-- Step 1: Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Users can read their own activity" ON public.activity_logs;
DROP POLICY IF EXISTS "Admins can read all activity" ON public.activity_logs;
DROP POLICY IF EXISTS "Users can insert their own activity" ON public.activity_logs;
DROP POLICY IF EXISTS "Allow system inserts" ON public.activity_logs;

-- Step 1.5: Drop trigger first (before dropping functions it depends on)
DROP TRIGGER IF EXISTS on_activity_log_insert ON public.activity_logs;

-- Step 1.6: Drop existing functions to allow type changes
DROP FUNCTION IF EXISTS public.get_client_ip();
DROP FUNCTION IF EXISTS public.handle_activity_log_metadata();

-- Step 2: Fix the get_client_ip function to return TEXT (not INET)
CREATE OR REPLACE FUNCTION public.get_client_ip()
RETURNS TEXT AS $$
BEGIN
  -- Try to get IP from various common headers directly
  RETURN COALESCE(
    nullif(current_setting('request.headers.x-forwarded-for', true), ''),
    nullif(current_setting('request.headers.x-real-ip', true), ''),
    nullif(current_setting('request.headers.cf-connecting-ip', true), ''),
    nullif(current_setting('request.headers.x-client-ip', true), ''),
    '127.0.0.1'
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN '127.0.0.1';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 3: Fix the trigger function to work with TEXT ip_address
CREATE OR REPLACE FUNCTION public.handle_activity_log_metadata()
RETURNS TRIGGER AS $$
BEGIN
  -- Always set created_at just in case
  IF NEW.created_at IS NULL THEN
    NEW.created_at := now();
  END IF;

  -- Determine IP (handle TEXT type)
  IF NEW.ip_address IS NULL OR NEW.ip_address = '' OR NEW.ip_address = '0.0.0.0' THEN
    NEW.ip_address := public.get_client_ip();
  END IF;
  
  -- Determine User Agent
  IF NEW.user_agent IS NULL OR NEW.user_agent = '' OR NEW.user_agent = 'Server/Unknown' THEN
    BEGIN
      NEW.user_agent := nullif(current_setting('request.headers.user-agent', true), '');
    EXCEPTION WHEN OTHERS THEN
      -- Fall through
    END;
    
    -- Final fallback if still empty
    IF NEW.user_agent IS NULL OR NEW.user_agent = '' THEN
      NEW.user_agent := 'Unknown';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 4: Create READ policies
CREATE POLICY "Users can read their own activity"
ON public.activity_logs FOR SELECT
USING (
  user_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
);

CREATE POLICY "Admins can read all activity"
ON public.activity_logs FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid()
    AND role @> ARRAY['admin']
  )
);

-- Step 5: Create INSERT policies (THIS WAS MISSING!)
CREATE POLICY "Users can insert their own activity"
ON public.activity_logs FOR INSERT
WITH CHECK (
  user_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  OR user_id IS NULL  -- Allow system logs
);

-- Step 6: Recreate trigger
DROP TRIGGER IF EXISTS on_activity_log_insert ON public.activity_logs;
CREATE TRIGGER on_activity_log_insert
  BEFORE INSERT ON public.activity_logs
  FOR EACH ROW EXECUTE FUNCTION public.handle_activity_log_metadata();

-- Step 7: Test with a sample insert
DO $$
DECLARE
  test_profile_id UUID;
BEGIN
  -- Get the first profile ID for testing
  SELECT id INTO test_profile_id FROM public.profiles LIMIT 1;
  
  IF test_profile_id IS NOT NULL THEN
    INSERT INTO public.activity_logs (user_id, action, details)
    VALUES (test_profile_id, 'test_log', '{"test": "This is a test log entry"}'::jsonb);
    
    RAISE NOTICE 'Test log inserted successfully! Your activity logs should now work.';
  ELSE
    RAISE NOTICE 'No profiles found to test with.';
  END IF;
END $$;

-- Step 8: Verify the test log was created
SELECT 
  id,
  user_id,
  action,
  details,
  ip_address,
  user_agent,
  created_at
FROM public.activity_logs
WHERE action = 'test_log'
ORDER BY created_at DESC
LIMIT 1;
