-- Migration: Delete all bulk-created student accounts (V2)
-- Be careful! This deletes all accounts marked as 'is_student' or matching the noreply pattern.

-- 1. Unlink students first
UPDATE public.students 
SET user_id = NULL 
WHERE user_id IN (
    SELECT id FROM auth.users WHERE email ILIKE 'noreply-%@ekc.edu.in'
);

-- 2. Delete activity logs (Fix: Match profiles.id, not users.id)
DELETE FROM public.activity_logs
WHERE user_id IN (
    SELECT id FROM public.profiles 
    WHERE user_id IN (SELECT id FROM auth.users WHERE email ILIKE 'noreply-%@ekc.edu.in')
);

-- 3. Delete profiles (Fix: Match user_id)
DELETE FROM public.profiles 
WHERE user_id IN (
    SELECT id FROM auth.users WHERE email ILIKE 'noreply-%@ekc.edu.in'
);

-- 4. Delete auth users
-- This is the most important part
DELETE FROM auth.users 
WHERE email ILIKE 'noreply-%@ekc.edu.in';

-- 4. Verify
SELECT COUNT(*) as remaining_accounts FROM auth.users WHERE email ILIKE 'noreply-%@ekc.edu.in';
