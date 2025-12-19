-- Migration: Add user_id column to students table
-- Created: 2025-12-21
-- This must run BEFORE the bulk_student_accounts migration

-- Add user_id column to link students to auth users
ALTER TABLE students
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_students_user_id ON students(user_id);

-- Comment
COMMENT ON COLUMN students.user_id IS 'Foreign key to auth.users - links student to their login account';
