-- Migration: Add student profile fields and first login tracking
-- Created: 2025-12-19

-- Add fields to students table
ALTER TABLE students 
ADD COLUMN IF NOT EXISTS phone_number TEXT,
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS gender TEXT CHECK (gender IN ('Male', 'Female'));

-- Add first login tracking to profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS is_first_login BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS profile_completed BOOLEAN DEFAULT false;

-- Add index on roll_number for faster lookups
CREATE INDEX IF NOT EXISTS idx_students_roll_number ON students(roll_number);

-- Comments
COMMENT ON COLUMN students.phone_number IS 'Student phone number (added during profile setup)';
COMMENT ON COLUMN students.email IS 'Student email (added during profile setup)';
COMMENT ON COLUMN students.gender IS 'Student gender - Male or Female';
COMMENT ON COLUMN profiles.is_first_login IS 'True if user has not changed password yet';
COMMENT ON COLUMN profiles.profile_completed IS 'True if user has completed profile setup';
