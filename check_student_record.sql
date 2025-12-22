-- Check if your user has a student record
-- Replace 'YOUR_EMAIL' with your actual login email

-- Step 1: Find your user_id
SELECT id, email FROM auth.users WHERE email = 'YOUR_EMAIL';

-- Step 2: Check if you have a profile
SELECT * FROM public.profiles WHERE user_id = (SELECT id FROM auth.users WHERE email = 'YOUR_EMAIL');

-- Step 3: Check if you have a student record
SELECT * FROM public.students WHERE user_id = (SELECT id FROM auth.users WHERE email = 'YOUR_EMAIL');

-- If the student record doesn't exist, that's the problem!
-- The dashboard code exits early if no student record exists.
