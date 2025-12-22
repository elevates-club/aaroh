-- Migration: Import Off-Stage Events from PDF
-- Description: Inserts 32 new events into the 'events' table.
-- 'Debate (English)' is set as a GROUP event.
-- All other events are INDIVIDUAL.
-- Default participation limit: 3 per batch for individual, 1 group per batch for group events.

-- Use CTE to define data and insert only if not exists
WITH new_events (name, description, category, mode, registration_method, max_entries_per_year, min_team_size, max_team_size, venue, is_active) AS (
  VALUES
    -- 1. Painting (Water Colour)
    ('Painting (Water Colour)', 'Visual art competition using water colors.', 'off_stage', 'individual', 'student', 3, 1, 1, 'TBA', true),
    -- 2. Painting (Oil Colour)
    ('Painting (Oil Colour)', 'Visual art competition using oil colors.', 'off_stage', 'individual', 'student', 3, 1, 1, 'TBA', true),
    -- 3. Pencil Drawing
    ('Pencil Drawing', 'Creative expression through graphite/charcoal.', 'off_stage', 'individual', 'student', 3, 1, 1, 'TBA', true),
    -- 4. Cartoon Drawing
    ('Cartoon Drawing', 'Art of creating humorous or satirical illustrations.', 'off_stage', 'individual', 'student', 3, 1, 1, 'TBA', true),
    -- 5. Clay Modeling
    ('Clay Modeling', 'Sculpting and shaping clay into artistic forms.', 'off_stage', 'individual', 'student', 3, 1, 1, 'TBA', true),
    -- 6. Collage
    ('Collage', 'Artistic composition of materials pasted over a surface.', 'off_stage', 'individual', 'student', 3, 1, 1, 'TBA', true),
    -- 7. Embroidery
    ('Embroidery', 'Craft of decorating fabric using a needle and thread.', 'off_stage', 'individual', 'student', 3, 1, 1, 'TBA', true),
    -- 8. Face Painting
    ('Face Painting', 'painting on the face.', 'off_stage', 'individual', 'student', 3, 1, 1, 'TBA', true),
    -- 9. Rangoli
    ('Rangoli', 'Art form creating patterns on the floor.', 'off_stage', 'individual', 'student', 3, 1, 1, 'TBA', true),
    -- 10. Debate (English) - GROUP EVENT
    ('Debate (English)', 'Formal discussion on a particular topic.', 'off_stage', 'group', 'coordinator', 1, 2, 4, 'TBA', true),
    -- 11. Quiz Competition
    ('Quiz Competition', 'General knowledge and current affairs competition.', 'off_stage', 'individual', 'student', 3, 1, 1, 'TBA', true),
    -- 12. Extempore Malayalam
    ('Extempore Malayalam', 'Impru speech in Malayalam.', 'off_stage', 'individual', 'student', 3, 1, 1, 'TBA', true),
    -- 13. Extempore English
    ('Extempore English', 'Impru speech in English.', 'off_stage', 'individual', 'student', 3, 1, 1, 'TBA', true),
    -- 14. Extempore Hindi
    ('Extempore Hindi', 'Impru speech in Hindi.', 'off_stage', 'individual', 'student', 3, 1, 1, 'TBA', true),
    -- 15. Extempore Arabic
    ('Extempore Arabic', 'Impru speech in Arabic.', 'off_stage', 'individual', 'student', 3, 1, 1, 'TBA', true),
    -- 16. Extempore Sanskrit
    ('Extempore Sanskrit', 'Impru speech in Sanskrit.', 'off_stage', 'individual', 'student', 3, 1, 1, 'TBA', true),
    -- 17. Story Writing Malayalam
    ('Story Writing Malayalam', 'Creative writing in Malayalam.', 'off_stage', 'individual', 'student', 3, 1, 1, 'TBA', true),
    -- 18. Story Writing English
    ('Story Writing English', 'Creative writing in English.', 'off_stage', 'individual', 'student', 3, 1, 1, 'TBA', true),
    -- 19. Story Writing Hindi
    ('Story Writing Hindi', 'Creative writing in Hindi.', 'off_stage', 'individual', 'student', 3, 1, 1, 'TBA', true),
    -- 20. Story Writing Arabic
    ('Story Writing Arabic', 'Creative writing in Arabic.', 'off_stage', 'individual', 'student', 3, 1, 1, 'TBA', true),
    -- 21. Story Writing Sanskrit
    ('Story Writing Sanskrit', 'Creative writing in Sanskrit.', 'off_stage', 'individual', 'student', 3, 1, 1, 'TBA', true),
    -- 22. Versification Malayalam
    ('Versification Malayalam', 'Poetry writing in Malayalam.', 'off_stage', 'individual', 'student', 3, 1, 1, 'TBA', true),
    -- 23. Versification English
    ('Versification English', 'Poetry writing in English.', 'off_stage', 'individual', 'student', 3, 1, 1, 'TBA', true),
    -- 24. Versification Hindi
    ('Versification Hindi', 'Poetry writing in Hindi.', 'off_stage', 'individual', 'student', 3, 1, 1, 'TBA', true),
    -- 25. Versification Arabic
    ('Versification Arabic', 'Poetry writing in Arabic.', 'off_stage', 'individual', 'student', 3, 1, 1, 'TBA', true),
    -- 26. Versification Sanskrit
    ('Versification Sanskrit', 'Poetry writing in Sanskrit.', 'off_stage', 'individual', 'student', 3, 1, 1, 'TBA', true),
    -- 27. Essay Writing Malayalam
    ('Essay Writing Malayalam', 'Essay writing in Malayalam.', 'off_stage', 'individual', 'student', 3, 1, 1, 'TBA', true),
    -- 28. Essay Writing English
    ('Essay Writing English', 'Essay writing in English.', 'off_stage', 'individual', 'student', 3, 1, 1, 'TBA', true),
    -- 29. Essay Writing Hindi
    ('Essay Writing Hindi', 'Essay writing in Hindi.', 'off_stage', 'individual', 'student', 3, 1, 1, 'TBA', true),
    -- 30. Essay Writing Arabic
    ('Essay Writing Arabic', 'Essay writing in Arabic.', 'off_stage', 'individual', 'student', 3, 1, 1, 'TBA', true),
    -- 31. Essay Writing Sanskrit
    ('Essay Writing Sanskrit', 'Essay writing in Sanskrit.', 'off_stage', 'individual', 'student', 3, 1, 1, 'TBA', true),
    -- 32. Spot Photography
    ('Spot Photography', 'Photography competition.', 'off_stage', 'individual', 'student', 3, 1, 1, 'TBA', true)
)
INSERT INTO public.events (name, description, category, mode, registration_method, max_entries_per_year, min_team_size, max_team_size, venue, is_active)
SELECT 
    name, 
    description, 
    category::public.event_category, 
    mode::public.event_mode, 
    registration_method::public.registration_method, 
    max_entries_per_year, 
    min_team_size, 
    max_team_size, 
    venue, 
    is_active
FROM new_events
WHERE NOT EXISTS (
    SELECT 1 FROM public.events e WHERE e.name = new_events.name
);
