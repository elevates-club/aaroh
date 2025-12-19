-- Migration: Fix event_category enum and add max_participants column
-- Created: 2025-12-19

-- Step 1: Add max_participants column to events table
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS max_participants INTEGER;

-- Step 2: Remove 'sports' from event_category enum
-- Note: PostgreSQL doesn't support removing enum values directly
-- We need to create a new enum and migrate

-- Create new enum without 'sports'
DO $$ 
BEGIN
  -- Drop the old enum type if it exists (will only work if not in use)
  -- We'll create a new one with the correct values
  CREATE TYPE event_category_new AS ENUM ('on_stage', 'off_stage');
EXCEPTION
  WHEN duplicate_object THEN
    -- Type already exists, do nothing
    NULL;
END $$;

-- Update the column to use the new enum type
-- First, alter to text to avoid type conflicts
ALTER TABLE events 
  ALTER COLUMN category TYPE TEXT;

-- Remove any 'sports' values if they exist (set to 'on_stage' as default)
UPDATE events 
SET category = 'on_stage' 
WHERE category = 'sports';

-- Now change to the new enum type
ALTER TABLE events 
  ALTER COLUMN category TYPE event_category_new 
  USING category::event_category_new;

-- Drop the old enum type
DROP TYPE IF EXISTS event_category CASCADE;

-- Rename new enum to original name
ALTER TYPE event_category_new RENAME TO event_category;

-- Add comment for documentation
COMMENT ON COLUMN events.max_participants IS 'Maximum number of participants allowed for this event (null means unlimited)';
COMMENT ON TYPE event_category IS 'Event categories: on_stage (performances), off_stage (competitions/exhibitions)';
