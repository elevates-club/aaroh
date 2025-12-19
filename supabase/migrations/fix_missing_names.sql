-- Fix missing names in profiles and auth metadata

-- 1. Sync profiles.full_name from students table for linked users
UPDATE public.profiles p
SET full_name = s.name
FROM public.students s
WHERE p.user_id = s.user_id
  AND (p.full_name LIKE 'noreply-%' OR p.full_name IS NULL);

-- 2. Update auth.users metadata to include 'full_name' if missing (copied from 'name')
UPDATE auth.users
SET raw_user_meta_data = 
  COALESCE(raw_user_meta_data, '{}'::jsonb) || 
  jsonb_build_object('full_name', raw_user_meta_data->>'name')
WHERE (raw_user_meta_data->>'full_name') IS NULL 
  AND (raw_user_meta_data->>'name') IS NOT NULL;
  
-- 3. Also try to update from student table if metadata name is totally missing
UPDATE auth.users u
SET raw_user_meta_data = 
  COALESCE(raw_user_meta_data, '{}'::jsonb) || 
  jsonb_build_object('full_name', s.name, 'name', s.name)
FROM public.students s
WHERE u.id = s.user_id
  AND (u.raw_user_meta_data->>'name') IS NULL;
