-- Migration: Update Registration Limits
-- Description: Sets the default registration limits: 5 for On-Stage, 4 for Off-Stage.

INSERT INTO public.settings (key, value, updated_at)
VALUES 
  ('max_on_stage_registrations', '{"limit": 5}', NOW()),
  ('max_off_stage_registrations', '{"limit": 4}', NOW())
ON CONFLICT (key) 
DO UPDATE SET 
  value = EXCLUDED.value,
  updated_at = NOW();
