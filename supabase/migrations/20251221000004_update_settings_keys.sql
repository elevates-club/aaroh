-- Migration: Update settings keys for Arts festival terminology
-- Created: 2025-12-19

-- Update settings table keys from Game/Athletic to On-Stage/Off-Stage
UPDATE settings 
SET key = 'max_on_stage_registrations' 
WHERE key = 'max_game_registrations';

UPDATE settings 
SET key = 'max_off_stage_registrations' 
WHERE key = 'max_athletic_registrations';

-- Add comments for clarity
COMMENT ON TABLE settings IS 'System-wide configuration settings for AAROH Arts Festival Management';
