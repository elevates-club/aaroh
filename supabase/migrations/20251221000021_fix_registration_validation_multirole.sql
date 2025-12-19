-- Fix validate_aaroh_registration for multi-role support
-- The role column is now TEXT[] not user_role enum

CREATE OR REPLACE FUNCTION public.validate_aaroh_registration()
RETURNS TRIGGER AS $$
DECLARE
    v_event_mode public.event_mode;
    v_reg_method public.registration_method;
    v_student_year public.academic_year;
    v_max_entries INTEGER;
    v_current_entries INTEGER;
    v_roles TEXT[];  -- Changed from user_role to TEXT[]
BEGIN
    -- Get event details
    SELECT mode, registration_method, max_entries_per_year 
    INTO v_event_mode, v_reg_method, v_max_entries
    FROM public.events WHERE id = NEW.event_id;

    -- Get student year
    SELECT year INTO v_student_year FROM public.students WHERE id = NEW.student_id;
    
    -- Get user roles (now an array)
    SELECT role INTO v_roles FROM public.profiles WHERE id = NEW.registered_by;

    -- 1. Check Role-based access
    -- For student self-registration events
    IF v_reg_method = 'student' AND NOT ('student' = ANY(v_roles)) THEN
        RAISE EXCEPTION 'This event requires student self-registration.';
    END IF;
    
    -- For coordinator-only events
    IF v_reg_method = 'coordinator' THEN
        IF NOT (
            'admin' = ANY(v_roles) OR
            'first_year_coordinator' = ANY(v_roles) OR
            'second_year_coordinator' = ANY(v_roles) OR
            'third_year_coordinator' = ANY(v_roles) OR
            'fourth_year_coordinator' = ANY(v_roles)
        ) THEN
            RAISE EXCEPTION 'Only coordinators can register for this event.';
        END IF;
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
