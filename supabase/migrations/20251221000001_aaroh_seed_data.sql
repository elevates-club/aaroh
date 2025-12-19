-- AAROH Arts Festival Seed Data
-- This script clears old sports data and populates it with fresh AAROH entries.

-- 1. Clear old data (Registrations first, then Events/Students)
-- WARNING: This will delete current registrations.
TRUNCATE public.registrations CASCADE;
TRUNCATE public.events CASCADE;
TRUNCATE public.students CASCADE;

-- 2. Seed AAROH Students
INSERT INTO public.students (name, roll_number, department, year) VALUES
('Arjun Kumar', 'CS2101', 'Computer Science', 'fourth'),
('Meera Nair', 'CS2102', 'Computer Science', 'fourth'),
('Rahul Das', 'EC2205', 'Electronics', 'third'),
('Sneha Pillai', 'EC2208', 'Electronics', 'third'),
('Karthick S', 'ME2310', 'Mechanical', 'second'),
('Anjali Menon', 'ME2312', 'Mechanical', 'second'),
('Abhishek G', 'CE2401', 'Civil Engineering', 'first'),
('Sreelekshmi K', 'CE2404', 'Civil Engineering', 'first');

-- 3. Seed AAROH Events (formerly Sports table)
INSERT INTO public.events (name, description, category, mode, registration_method, max_entries_per_year, min_team_size, max_team_size, venue, is_active) VALUES
-- On-Stage Events
('Bharatanatyam (Solo)', 'Traditional classical dance performance.', 'on_stage', 'individual', 'student', 3, 1, 1, 'Main Auditorium', true),
('Group Dance (Folk)', 'Vibrant folk dance performance by teams.', 'on_stage', 'group', 'coordinator', 1, 4, 12, 'Open Stage', true),
('Light Music (Solo)', 'Solo vocal performance of popular film/light songs.', 'on_stage', 'individual', 'student', 3, 1, 1, 'Mini Hall', true),
('Mime', 'Silent theatrical performance using gestures.', 'on_stage', 'group', 'coordinator', 1, 4, 8, 'Main Auditorium', true),

-- Off-Stage Events
('Pencil Drawing', 'Creative expression through graphite/charcoal.', 'off_stage', 'individual', 'student', 3, 1, 1, 'Gallery-A', true),
('Poetry Writing', 'Original compositions in Malayalam/English.', 'off_stage', 'individual', 'student', 5, 1, 1, 'Library Hall', true),
('Quiz', 'General knowledge and current affairs competition.', 'off_stage', 'group', 'coordinator', 1, 2, 3, 'Seminar Hall', true),
('Painting (Water Color)', 'Visual art competition.', 'off_stage', 'individual', 'student', 3, 1, 1, 'Gallery-B', true),
('Story Writing', 'Short story competition.', 'off_stage', 'individual', 'student', 3, 1, 1, 'Library Hall', true);

-- 4. Log the initialization
INSERT INTO public.activity_logs (action, details) VALUES
('system_initialized', '{"message": "AAROH database seeded with fresh arts events", "timestamp": "' || NOW() || '"}');
