-- Migration: Delete all bulk-created student accounts
-- Run this to clean up before re-running the script

-- Delete profiles for student accounts (noreply emails)
DELETE FROM public.profiles 
WHERE email LIKE 'noreply-%@ekc.edu.in';

-- Delete auth users for student accounts
DELETE FROM auth.users 
WHERE email LIKE 'noreply-%@ekc.edu.in';

-- Reset user_id in students table
UPDATE public.students 
SET user_id = NULL 
WHERE user_id IS NOT NULL;

-- Verify cleanup
SELECT COUNT(*) as remaining_student_accounts 
FROM auth.users 
WHERE email LIKE 'noreply-%@ekc.edu.in';
