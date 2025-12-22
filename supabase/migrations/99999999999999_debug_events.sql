-- ============================================
-- DIAGNOSTIC QUERIES FOR EVENTS ISSUE
-- ============================================
-- Run these queries in Supabase SQL Editor to diagnose why events aren't showing

-- 1. Check total event count
SELECT COUNT(*) as total_events FROM public.events;

-- 2. Check active events count
SELECT COUNT(*) as active_events FROM public.events WHERE is_active = true;

-- 3. View sample events
SELECT 
    id, 
    name, 
    category,
    is_active, 
    registration_deadline, 
    event_date,
    created_at
FROM public.events 
ORDER BY created_at DESC 
LIMIT 10;

-- 4. Check RLS policies on events table
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'events';

-- 5. Check if RLS is enabled
SELECT 
    tablename, 
    rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'events';

-- ============================================
-- FIXES (Run these if diagnostics show issues)
-- ============================================

-- FIX 1: If all events are inactive, activate them
-- UPDATE public.events SET is_active = true WHERE is_active = false;

-- FIX 2: If no "Anyone can view active events" policy exists, create it
-- DROP POLICY IF EXISTS "Anyone can view active events" ON public.events;
-- CREATE POLICY "Anyone can view active events" 
-- ON public.events FOR SELECT 
-- USING (is_active = true);

-- FIX 3: If you want students to see ALL events (active or not), use this instead
-- DROP POLICY IF EXISTS "Anyone can view active events" ON public.events;
-- CREATE POLICY "Students can view all events" 
-- ON public.events FOR SELECT 
-- TO authenticated
-- USING (true);

-- FIX 4: Ensure settings RLS policy exists
-- DROP POLICY IF EXISTS "Everyone can view settings" ON public.settings;
-- CREATE POLICY "Everyone can view settings" 
-- ON public.settings FOR SELECT 
-- TO authenticated 
-- USING (true);
