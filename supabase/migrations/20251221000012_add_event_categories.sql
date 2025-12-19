-- Migration: Add category field to events table
-- Created: 2025-12-19

-- Add category column to events table
ALTER TABLE events
ADD COLUMN category TEXT NOT NULL DEFAULT 'on_stage';

-- Add check constraint for valid categories
ALTER TABLE events
ADD CONSTRAINT events_category_check 
CHECK (category IN ('on_stage', 'off_stage'));

-- Create index for faster filtering
CREATE INDEX idx_events_category ON events(category);

-- Update existing events to have a default category
UPDATE events SET category = 'on_stage' WHERE category IS NULL;

COMMENT ON COLUMN events.category IS 'Event category: on_stage (performances) or off_stage (other activities)';
