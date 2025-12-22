-- Quick fix: Insert registration limits into settings table
-- Run this in Supabase SQL Editor

-- First, check what's currently in settings
SELECT * FROM public.settings WHERE key IN ('max_on_stage_registrations', 'max_off_stage_registrations');

-- Insert or update the registration limits
INSERT INTO public.settings (key, value, updated_at)
VALUES 
  ('max_on_stage_registrations', '{"limit": 5}', NOW()),
  ('max_off_stage_registrations', '{"limit": 4}', NOW())
ON CONFLICT (key) 
DO UPDATE SET 
  value = EXCLUDED.value,
  updated_at = NOW();

-- Verify the insert
SELECT * FROM public.settings WHERE key IN ('max_on_stage_registrations', 'max_off_stage_registrations');
