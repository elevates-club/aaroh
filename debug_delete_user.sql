-- Force Delete User Script
-- Usage: Run this in Supabase Dashboard > SQL Editor

DO $$
DECLARE
    target_email TEXT := 'tc22.2902@ekc.edu.in'; -- EMAIL TO DELETE
    target_user_id UUID;
BEGIN
    -- 1. Get User ID
    SELECT id INTO target_user_id FROM auth.users WHERE email = target_email;

    IF target_user_id IS NULL THEN
        RAISE NOTICE 'User % not found in auth.users', target_email;
        RETURN;
    END IF;

    RAISE NOTICE 'Deleting User: % (ID: %)', target_email, target_user_id;

    -- 2. Delete Activity Logs
    DELETE FROM public.activity_logs WHERE user_id = target_user_id;
    RAISE NOTICE 'Deleted activity_logs';

    -- 3. Delete Team Members (via Registrations)
    -- Complex deletion needing CTEs or subqueries
    WITH target_student AS (
        SELECT id FROM public.students WHERE user_id = target_user_id
    ),
    target_regs AS (
        SELECT id FROM public.registrations WHERE student_id IN (SELECT id FROM target_student)
    )
    DELETE FROM public.team_members WHERE registration_id IN (SELECT id FROM target_regs);
    RAISE NOTICE 'Deleted team_members';

    -- 4. Delete Registrations
    DELETE FROM public.registrations WHERE student_id IN (SELECT id FROM public.students WHERE user_id = target_user_id);
    RAISE NOTICE 'Deleted registrations';

    -- 5. Delete Student Record
    DELETE FROM public.students WHERE user_id = target_user_id;
    RAISE NOTICE 'Deleted students';

    -- 6. Delete Profile
    DELETE FROM public.profiles WHERE id = target_user_id;
    RAISE NOTICE 'Deleted profiles';

    -- 7. Delete Auth User
    DELETE FROM auth.users WHERE id = target_user_id;
    RAISE NOTICE 'Deleted auth.users';

    RAISE NOTICE 'User % successfully deleted', target_email;
END $$;
