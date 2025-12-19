-- Rename 'sports' to 'events' and 'sport_id' to 'event_id'
-- This migration fully transitions the database from Sports-focused to Arts-focused.

-- 1. Rename the table
ALTER TABLE IF EXISTS public.sports RENAME TO events;

-- 2. Rename columns in registrations table
ALTER TABLE IF EXISTS public.registrations RENAME COLUMN sport_id TO event_id;

-- 3. Update the validation trigger
CREATE OR REPLACE FUNCTION public.validate_aaroh_registration()
RETURNS TRIGGER AS $$
DECLARE
    v_event_mode public.event_mode;
    v_reg_method public.registration_method;
    v_student_year public.academic_year;
    v_max_entries INTEGER;
    v_current_entries INTEGER;
    v_role public.user_role;
BEGIN
    -- Use the new table and column names
    SELECT mode, registration_method, max_entries_per_year 
    INTO v_event_mode, v_reg_method, v_max_entries
    FROM public.events WHERE id = NEW.event_id;

    -- Get student year
    SELECT year INTO v_student_year FROM public.students WHERE id = NEW.student_id;
    
    -- Get user role
    SELECT role INTO v_role FROM public.profiles WHERE user_id = auth.uid();

    -- 1. Check Role-based access
    IF v_reg_method = 'student' AND v_role != 'student' THEN
        RAISE EXCEPTION 'This event requires student self-registration.';
    END IF;
    
    IF v_reg_method = 'coordinator' AND v_role NOT IN ('admin', 'first_year_coordinator', 'second_year_coordinator', 'third_year_coordinator', 'fourth_year_coordinator') THEN
        RAISE EXCEPTION 'Only coordinators can register for this event.';
    END IF;

    -- 2. Participation Limits
    IF v_event_mode = 'individual' THEN
        -- Max X participants per year per event
        SELECT COUNT(DISTINCT r.student_id) INTO v_current_entries
        FROM public.registrations r
        JOIN public.students s ON r.student_id = s.id
        WHERE r.event_id = NEW.event_id AND s.year = v_student_year AND r.status != 'rejected';
        
        IF v_current_entries >= v_max_entries THEN
             RAISE EXCEPTION 'Maximum participation limit (%) reached for % year in this event.', v_max_entries, v_student_year;
        END IF;
    ELSE
        -- Group Mode: Max 1 group per year per event
        IF EXISTS (
            SELECT 1 FROM public.registrations r
            JOIN public.students s ON r.student_id = s.id
            WHERE r.event_id = NEW.event_id AND s.year = v_student_year AND r.status != 'rejected'
            AND (NEW.group_id IS NULL OR r.group_id != NEW.group_id)
        ) THEN
            RAISE EXCEPTION 'Only one group per year is allowed for this event.';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Update Policies for the renamed table
-- Drop old policies (they might refer to the old table name or be renamed automatically, but recreting is safer)
DROP POLICY IF EXISTS "Anyone can view active events" ON public.events;
DROP POLICY IF EXISTS "Admins manage events" ON public.events;

CREATE POLICY "Anyone can view active events" ON public.events FOR SELECT USING (is_active = true);
CREATE POLICY "Admins manage events" ON public.events FOR ALL USING (EXISTS (
    SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin'
));

-- 5. Update Policies for registrations (Check sport_id -> event_id)
DROP POLICY IF EXISTS "Student self-register individual" ON public.registrations;
CREATE POLICY "Student self-register individual" ON public.registrations FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.profiles p 
        WHERE p.user_id = auth.uid() AND p.role = 'student'
    )
    AND EXISTS (
        SELECT 1 FROM public.events e 
        WHERE e.id = event_id AND e.registration_method = 'student'
    )
);

-- 6. Rename constraints for consistency
DO $$ BEGIN
    ALTER TABLE public.events RENAME CONSTRAINT sports_created_by_fkey TO events_created_by_fkey;
EXCEPTION WHEN undefined_object THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE public.registrations RENAME CONSTRAINT registrations_sport_id_fkey TO registrations_event_id_fkey;
EXCEPTION WHEN undefined_object THEN NULL; END $$;

-- 7. Ensure the category default is correct and remove 'sports' category reference
ALTER TABLE public.events ALTER COLUMN category SET DEFAULT 'off_stage';
