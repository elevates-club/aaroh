-- Migration: Create Event Results and Points System
-- Created: 2025-12-23
-- Description: Implements AAROH Points Rules (Positon-based and Negative points for DNA)

-- 1. Create Enums
CREATE TYPE public.event_position AS ENUM ('first', 'second', 'third', 'none');
CREATE TYPE public.participation_status AS ENUM ('participated', 'did_not_participate');

-- 2. Create Table
CREATE TABLE IF NOT EXISTS public.event_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    registration_id UUID NOT NULL REFERENCES public.registrations(id) ON DELETE CASCADE,
    position public.event_position DEFAULT 'none',
    status public.participation_status DEFAULT 'participated',
    points INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    entered_by UUID REFERENCES auth.users(id),
    
    -- Ensure one result per registration
    CONSTRAINT unique_result_per_registration UNIQUE (registration_id)
);

-- 3. Enable RLS
ALTER TABLE public.event_results ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies
-- Public: Read Only
CREATE POLICY "Public can view results" ON public.event_results
    FOR SELECT USING (true);

-- Admins/Managers: Full Access
CREATE POLICY "Admins and Managers can manage results" ON public.event_results
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() 
            AND (role @> ARRAY['admin'] OR role @> ARRAY['event_manager'])
        )
    );

-- 5. Trigger Function to Calculate Points
CREATE OR REPLACE FUNCTION public.calculate_event_points()
RETURNS TRIGGER AS $$
DECLARE
    v_event_category public.event_category; -- 'on_stage' (Individual?) or 'off_stage'? Wait.
    -- Actually schemas use 'category' ('on_stage', 'off_stage') but logic depends on Individual/Group MODE.
    -- checking schema: sports table has 'mode' (individual/group).
    v_mode public.event_mode; 
BEGIN
    -- Fetch Event Mode via Registration
    SELECT e.mode INTO v_mode
    FROM public.registrations r
    JOIN public.events e ON e.id = r.event_id
    WHERE r.id = NEW.registration_id;

    -- Logic:
    -- If Status = DNA
    --   Individual: -3
    --   Group: -10
    -- If Status = Participated
    --   Individual: 1st=5, 2nd=3, 3rd=1, None=0
    --   Group: 1st=10, 2nd=5, 3rd=0, None=0

    IF NEW.status = 'did_not_participate' THEN
        IF v_mode = 'individual' THEN
            NEW.points := -3;
        ELSE -- group
            NEW.points := -10;
        END IF;
        -- Force position to none if DNA
        NEW.position := 'none';
        
    ELSE -- participated
        IF v_mode = 'individual' THEN
            CASE NEW.position
                WHEN 'first' THEN NEW.points := 5;
                WHEN 'second' THEN NEW.points := 3;
                WHEN 'third' THEN NEW.points := 1;
                ELSE NEW.points := 0;
            END CASE;
        ELSE -- group
            CASE NEW.position
                WHEN 'first' THEN NEW.points := 10;
                WHEN 'second' THEN NEW.points := 5;
                WHEN 'third' THEN NEW.points := 0; -- 3rd is 0 in Group?
                -- Rules check: "Group ... 3rd 0". Yes.
                ELSE NEW.points := 0;
            END CASE;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Attach Trigger
CREATE TRIGGER trigger_calculate_event_points
    BEFORE INSERT OR UPDATE ON public.event_results
    FOR EACH ROW
    EXECUTE FUNCTION public.calculate_event_points();

-- 7. View for Scoreboard (Aggregated)
-- Helper to easily query specific year points
CREATE OR REPLACE VIEW public.scoreboard_stats AS
SELECT 
    s.year,
    SUM(er.points) as total_points
FROM public.event_results er
JOIN public.registrations r ON er.registration_id = r.id
JOIN public.students s ON r.student_id = s.id
GROUP BY s.year;

-- Grant access to view
GRANT SELECT ON public.scoreboard_stats TO anon, authenticated, service_role;
