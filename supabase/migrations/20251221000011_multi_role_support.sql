-- Migration: Support multiple roles per user
-- Created: 2025-12-19

-- Step 1: Drop ALL existing RLS policies that depend on the role column
-- Events policies
DROP POLICY IF EXISTS "Admins manage events" ON events;
DROP POLICY IF EXISTS "Anyone can view active events" ON events;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON events;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON events;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON events;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON events;

-- Students policies
DROP POLICY IF EXISTS "Admins view all students" ON students;
DROP POLICY IF EXISTS "Coordinators view their year" ON students;
DROP POLICY IF EXISTS "Coordinators can read students" ON students;
DROP POLICY IF EXISTS "Admins can manage students" ON students;
DROP POLICY IF EXISTS "Coordinators view year students" ON students;

-- Registrations policies
DROP POLICY IF EXISTS "Coordinators register for their year" ON registrations;
DROP POLICY IF EXISTS "Student self-register individual" ON registrations;
DROP POLICY IF EXISTS "Users view registrations they are involved in" ON registrations;
DROP POLICY IF EXISTS "Coordinators can manage registrations" ON registrations;
DROP POLICY IF EXISTS "Admins can manage registrations" ON registrations;
DROP POLICY IF EXISTS "Admins view all registrations" ON registrations;
DROP POLICY IF EXISTS "Coordinators view their registrations" ON registrations;

-- Profiles policies
DROP POLICY IF EXISTS "Users can read their own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can manage all profiles" ON profiles;

-- Activity logs policies
DROP POLICY IF EXISTS "Users can read their own activity" ON activity_logs;
DROP POLICY IF EXISTS "Admins can read all activity" ON activity_logs;
DROP POLICY IF EXISTS "Admins view all activity" ON activity_logs;
DROP POLICY IF EXISTS "Coordinators view own activity" ON activity_logs;

-- Step 2: Change role column to text array to support multiple roles
ALTER TABLE profiles 
ALTER COLUMN role TYPE TEXT[] USING ARRAY[role]::TEXT[];

-- Step 3: Add a check constraint to ensure at least one role
ALTER TABLE profiles
ADD CONSTRAINT profiles_role_not_empty CHECK (array_length(role, 1) > 0);

-- Step 4: Recreate RLS policies with array-compatible logic
-- Note: Using role @> ARRAY['admin'] to check if array contains 'admin'

-- Profiles policies
CREATE POLICY "Users can read their own profile"
ON profiles FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all profiles"
ON profiles FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = auth.uid()
    AND role @> ARRAY['admin']
  )
);

-- Events policies
CREATE POLICY "Admins manage events"
ON events FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = auth.uid()
    AND role @> ARRAY['admin']
  )
);

-- Students policies
CREATE POLICY "Coordinators can read students"
ON students FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = auth.uid()
    AND (
      role @> ARRAY['admin'] OR
      role && ARRAY['first_year_coordinator', 'second_year_coordinator', 'third_year_coordinator', 'fourth_year_coordinator']
    )
  )
);

CREATE POLICY "Admins can manage students"
ON students FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = auth.uid()
    AND role @> ARRAY['admin']
  )
);

-- Registrations policies
CREATE POLICY "Coordinators can manage registrations"
ON registrations FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = auth.uid()
    AND (
      role @> ARRAY['admin'] OR
      role && ARRAY['first_year_coordinator', 'second_year_coordinator', 'third_year_coordinator', 'fourth_year_coordinator']
    )
  )
);

-- Activity logs policies
CREATE POLICY "Users can read their own activity"
ON activity_logs FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Admins can read all activity"
ON activity_logs FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = auth.uid()
    AND role @> ARRAY['admin']
  )
);

COMMENT ON COLUMN profiles.role IS 'User roles - can have multiple roles like admin, coordinator, student. Use @> to check if contains role, && to check if overlaps with roles.';
