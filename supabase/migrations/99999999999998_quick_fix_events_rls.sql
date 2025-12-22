-- Quick fix: Ensure students can view all active events
-- Run this migration to fix the RLS issue

-- 1. Enable RLS on events table
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- 2. Drop any conflicting policies
DROP POLICY IF EXISTS "Anyone can view active events" ON public.events;
DROP POLICY IF EXISTS "Students can view all events" ON public.events;
DROP POLICY IF EXISTS "Everyone can view active events" ON public.events;

-- 3. Create simple policy: authenticated users can see active events
CREATE POLICY "Authenticated users can view active events" 
ON public.events 
FOR SELECT 
TO authenticated
USING (is_active = true);

-- 4. Ensure admins can manage events
DROP POLICY IF EXISTS "Admins manage events" ON public.events;
CREATE POLICY "Admins manage events" 
ON public.events 
FOR ALL 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND 'admin' = ANY(role)
  )
);

-- 5. Make sure all events are active (if they should be)
UPDATE public.events 
SET is_active = true 
WHERE is_active IS NULL OR is_active = false;
