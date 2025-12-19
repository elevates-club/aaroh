-- AAROH Database Schema Migration
-- Sets up the core database for the AAROH Arts/Sports festival.

-- 1. Create Enums
DO $$ BEGIN
    CREATE TYPE public.user_role AS ENUM (
        'admin', 
        'first_year_coordinator', 
        'second_year_coordinator', 
        'third_year_coordinator', 
        'fourth_year_coordinator',
        'student'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE public.academic_year AS ENUM ('first', 'second', 'third', 'fourth');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE public.event_category AS ENUM ('on_stage', 'off_stage');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE public.event_mode AS ENUM ('individual', 'group');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE public.registration_method AS ENUM ('student', 'coordinator');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE public.registration_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. Core Tables
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role public.user_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  roll_number TEXT UNIQUE NOT NULL,
  department TEXT NOT NULL,
  year public.academic_year NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category public.event_category NOT NULL,
  mode public.event_mode NOT NULL DEFAULT 'individual',
  registration_method public.registration_method NOT NULL DEFAULT 'coordinator',
  min_team_size INTEGER DEFAULT 1,
  max_team_size INTEGER DEFAULT 1,
  max_entries_per_year INTEGER DEFAULT 3, -- Default for individual events
  registration_deadline TIMESTAMP WITH TIME ZONE,
  event_date TIMESTAMP WITH TIME ZONE,
  venue TEXT,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE NOT NULL,
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
  group_id UUID, -- For group events, students in same team share this ID
  registered_by UUID REFERENCES public.profiles(id),
  status public.registration_status DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(student_id, event_id)
);

CREATE TABLE IF NOT EXISTS public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id),
  action TEXT NOT NULL,
  details JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL,
  updated_by UUID REFERENCES public.profiles(id),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Functions & Triggers

-- Update Timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_students_updated_at BEFORE UPDATE ON public.students FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON public.events FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_registrations_updated_at BEFORE UPDATE ON public.registrations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Participation Rules Validation
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
    -- Get event details
    SELECT mode, registration_method, max_entries_per_year 
    INTO v_event_mode, v_reg_method, v_max_entries
    FROM public.events WHERE id = NEW.event_id;

    -- Get student year
    SELECT year INTO v_student_year FROM public.students WHERE id = NEW.student_id;
    
    -- Get user role
    SELECT role INTO v_role FROM public.profiles WHERE id = NEW.registered_by;

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

CREATE TRIGGER validate_aaroh_registration_trigger
BEFORE INSERT ON public.registrations
FOR EACH ROW EXECUTE FUNCTION public.validate_aaroh_registration();

-- New User Profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE((NEW.raw_user_meta_data->>'role')::public.user_role, 'student')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. RLS Policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- Events Policies
CREATE POLICY "Anyone can view active events" ON public.events FOR SELECT USING (is_active = true);
CREATE POLICY "Admins manage events" ON public.events FOR ALL USING (EXISTS (
    SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin'
));

-- Student Records Policies
CREATE POLICY "Admins view all students" ON public.students FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin'
));
CREATE POLICY "Coordinators view their year" ON public.students FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.user_id = auth.uid() AND (
      (p.role = 'first_year_coordinator' AND year = 'first') OR
      (p.role = 'second_year_coordinator' AND year = 'second') OR
      (p.role = 'third_year_coordinator' AND year = 'third') OR
      (p.role = 'fourth_year_coordinator' AND year = 'fourth')
    )
));

-- Registration Policies
CREATE POLICY "Users view registrations they are involved in" ON public.registrations FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = auth.uid() AND (p.role = 'admin' OR p.id = registered_by))
    OR student_id IN (SELECT id FROM public.students WHERE roll_number IN (SELECT email FROM auth.users WHERE id = auth.uid())) 
    -- Assuming student email = roll_number or stored in metadata. For now, registered_by is safer.
);

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
