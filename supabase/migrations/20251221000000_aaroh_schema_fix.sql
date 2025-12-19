-- Fix missing columns for AAROH transition
-- This ensures the 'sports' table has all AAROH metadata and 'registrations' has group_id.
-- We use the 'sports' name to match the existing codebase.

-- 1. Update 'sports' table with new metadata
DO $$ 
BEGIN
    -- Add category column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sports' AND column_name='category') THEN
        ALTER TABLE public.sports ADD COLUMN category public.event_category DEFAULT 'off_stage';
    END IF;

    -- Add mode column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sports' AND column_name='mode') THEN
        ALTER TABLE public.sports ADD COLUMN mode public.event_mode DEFAULT 'individual';
    END IF;

    -- Add registration_method column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sports' AND column_name='registration_method') THEN
        ALTER TABLE public.sports ADD COLUMN registration_method public.registration_method DEFAULT 'coordinator';
    END IF;

    -- Add min_team_size column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sports' AND column_name='min_team_size') THEN
        ALTER TABLE public.sports ADD COLUMN min_team_size INTEGER DEFAULT 1;
    END IF;

    -- Add max_team_size column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sports' AND column_name='max_team_size') THEN
        ALTER TABLE public.sports ADD COLUMN max_team_size INTEGER DEFAULT 1;
    END IF;

    -- Add max_entries_per_year column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sports' AND column_name='max_entries_per_year') THEN
        ALTER TABLE public.sports ADD COLUMN max_entries_per_year INTEGER DEFAULT 3;
    END IF;

    -- Update existing rows
    UPDATE public.sports SET category = 'off_stage' WHERE category IS NULL OR category = 'sports';
    UPDATE public.sports SET mode = 'individual' WHERE mode IS NULL;
    UPDATE public.sports SET registration_method = 'coordinator' WHERE registration_method IS NULL;
END $$;

-- 1.5 Safely update the enum to remove 'sports' (PostgreSQL 12+ approach)
-- Note: We can't easily remove an enum value if it's in use, but we just updated the rows above.
-- To completely remove it, we'd need to recreate the type, but for now we'll just stop using it.

-- 2. Update 'registrations' table with group_id
DO $$ 
BEGIN
    -- Add group_id column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='registrations' AND column_name='group_id') THEN
        ALTER TABLE public.registrations ADD COLUMN group_id UUID;
    END IF;
END $$;

-- 3. Ensure RLS is active and correct
ALTER TABLE public.sports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registrations ENABLE ROW LEVEL SECURITY;

-- Drop old policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Anyone can view active events" ON public.sports;
DROP POLICY IF EXISTS "Admins manage events" ON public.sports;
DROP POLICY IF EXISTS "Users view registrations they are involved in" ON public.registrations;
DROP POLICY IF EXISTS "Student self-register individual" ON public.registrations;
DROP POLICY IF EXISTS "Coordinators register for their year" ON public.registrations;

-- Re-create policies for 'sports'
CREATE POLICY "Anyone can view active events" ON public.sports FOR SELECT USING (is_active = true);
CREATE POLICY "Admins manage events" ON public.sports FOR ALL USING (EXISTS (
    SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin'
));

-- Re-create policies for 'registrations'
CREATE POLICY "Users view registrations they are involved in" ON public.registrations FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = auth.uid() AND (p.role = 'admin' OR p.id = registered_by))
    OR student_id IN (
        SELECT s.id FROM public.students s 
        JOIN public.profiles p ON p.email = s.roll_number -- Adjust this link if needed
        WHERE p.user_id = auth.uid()
    )
);

CREATE POLICY "Student self-register individual" ON public.registrations FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.profiles p 
        WHERE p.user_id = auth.uid() AND p.role = 'student'
    )
    AND EXISTS (
        SELECT 1 FROM public.sports s 
        WHERE s.id = sport_id AND s.registration_method = 'student'
    )
);

CREATE POLICY "Coordinators register for their year" ON public.registrations FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.profiles p 
        JOIN public.students s ON s.id = student_id
        WHERE p.user_id = auth.uid() AND (
            (p.role = 'first_year_coordinator' AND s.year = 'first') OR
            (p.role = 'second_year_coordinator' AND s.year = 'second') OR
            (p.role = 'third_year_coordinator' AND s.year = 'third') OR
            (p.role = 'fourth_year_coordinator' AND s.year = 'fourth') OR
            p.role = 'admin'
        )
    )
);

-- 4. Update the validation trigger to use the correct column names (sport_id)
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
    -- Get event details from 'sports' table
    SELECT mode, registration_method, max_entries_per_year 
    INTO v_event_mode, v_reg_method, v_max_entries
    FROM public.sports WHERE id = NEW.sport_id;

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
        WHERE r.sport_id = NEW.sport_id AND s.year = v_student_year AND r.status != 'rejected';
        
        IF v_current_entries >= v_max_entries THEN
             RAISE EXCEPTION 'Maximum participation limit (%) reached for % year in this event.', v_max_entries, v_student_year;
        END IF;
    ELSE
        -- Group Mode: Max 1 group per year per event
        IF EXISTS (
            SELECT 1 FROM public.registrations r
            JOIN public.students s ON r.student_id = s.id
            WHERE r.sport_id = NEW.sport_id AND s.year = v_student_year AND r.status != 'rejected'
            AND (NEW.group_id IS NULL OR r.group_id != NEW.group_id)
        ) THEN
            RAISE EXCEPTION 'Only one group per year is allowed for this event.';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
