-- Grant permissions to event_manager
-- This runs after the enum value has been committed

-- EVENTS: Full access (select, insert, update, delete)
CREATE POLICY "Event Managers can fully manage events"
ON public.events
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = auth.uid()
    AND role @> ARRAY['event_manager']
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = auth.uid()
    AND role @> ARRAY['event_manager']
  )
);

-- STUDENTS: Read-only access to all students
CREATE POLICY "Event Managers can view all students"
ON public.students
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = auth.uid()
    AND role @> ARRAY['event_manager']
  )
);

-- REGISTRATIONS: Full access to all registrations (View, Approve, Reject)
CREATE POLICY "Event Managers can view all registrations"
ON public.registrations
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = auth.uid()
    AND role @> ARRAY['event_manager']
  )
);

CREATE POLICY "Event Managers can update registrations"
ON public.registrations
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = auth.uid()
    AND role @> ARRAY['event_manager']
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = auth.uid()
    AND role @> ARRAY['event_manager']
  )
);

-- PROFILES: View access
CREATE POLICY "Event Managers can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = auth.uid()
    AND role @> ARRAY['event_manager']
  )
);
