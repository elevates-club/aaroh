-- Migration: Update Off-Stage Event Rules
-- Description: Updates the 'description' field of off-stage events with rules extracted from PDF.

-- 1. Painting (Water Colour)
UPDATE public.events 
SET description = 'Time limit: 1 hour. Only water colours allowed. Chart size will be informed in advance. Participants must bring their own materials. Topic will be given on the spot.'
WHERE name = 'Painting (Water Colour)';

-- 2. Painting (Oil Colour)
UPDATE public.events 
SET description = 'Time limit: 1 hour. Only oil colours permitted. Own materials only. No reference images allowed.'
WHERE name = 'Painting (Oil Colour)';

-- 3. Pencil Drawing
UPDATE public.events 
SET description = 'Time limit: 1 hour. Only pencil and eraser allowed. No colour pencils or pens. Topic given on the spot.'
WHERE name = 'Pencil Drawing';

-- 4. Cartoon Drawing
UPDATE public.events 
SET description = 'Time limit: 1 hour. Theme will be provided on the spot. Content must be non-offensive. Any drawing medium allowed (except digital).'
WHERE name = 'Cartoon Drawing';

-- 5. Clay Modeling
UPDATE public.events 
SET description = 'Time limit: 1 hour. Only clay permitted (no plaster). Theme given on the spot. Participants must bring tools if needed.'
WHERE name = 'Clay Modeling';

-- 6. Collage
UPDATE public.events 
SET description = 'Time limit: 1 hour. Only paper-based materials. Theme given on the spot.'
WHERE name = 'Collage';

-- 7. Embroidery
UPDATE public.events 
SET description = 'Time limit: 1 hour. Design/theme given on the spot. Participants must bring their own materials. Neatness and creativity considered.'
WHERE name = 'Embroidery';

-- 8. Face Painting
UPDATE public.events 
SET description = 'Time limit: 1 hour. Only safe, non-toxic colours. Theme will be provided. No objectionable designs allowed.'
WHERE name = 'Face Painting';

-- 9. Rangoli
UPDATE public.events 
SET description = 'Time limit: 1 hour. Only dry colours allowed. No stencils allowed. Theme given on the spot.'
WHERE name = 'Rangoli';

-- 10. Debate (English)
UPDATE public.events 
SET description = 'Team of two. Topic announced on spot. Time limit per speaker: 5 minutes. Decency and language discipline required.'
WHERE name = 'Debate (English)';

-- 11. Quiz Competition
UPDATE public.events 
SET description = 'Multiple rounds may be conducted. Use of mobile phones strictly prohibited. Quiz master’s decision is final.'
WHERE name = 'Quiz Competition';

-- 12. Extempore (All Languages)
UPDATE public.events 
SET description = 'Individual participation. Topic given on the spot. Preparation time: 2–3 minutes. Speaking time: 5 minutes. Use of notes and mobile phones are not allowed.'
WHERE name IN ('Extempore Malayalam', 'Extempore English', 'Extempore Hindi', 'Extempore Arabic', 'Extempore Sanskrit');

-- 13. Story Writing (All Languages)
UPDATE public.events 
SET description = 'Individual participation. Topic given on the spot. Time limit: 1 hour. Only handwritten content. No plagiarism.'
WHERE name IN ('Story Writing Malayalam', 'Story Writing English', 'Story Writing Hindi', 'Story Writing Arabic', 'Story Writing Sanskrit');

-- 14. Versification (All Languages)
UPDATE public.events 
SET description = 'Individual participation. Topic provided on the spot. Time limit: 1 hour. Original work only. Evaluation based on creativity and language.'
WHERE name IN ('Versification Malayalam', 'Versification English', 'Versification Hindi', 'Versification Arabic', 'Versification Sanskrit');

-- 15. Essay Writing (All Languages)
UPDATE public.events 
SET description = 'Topic given on the spot. Time limit: 1 hour. Word limit will be informed. Handwritten essays only.'
WHERE name IN ('Essay Writing Malayalam', 'Essay Writing English', 'Essay Writing Hindi', 'Essay Writing Arabic', 'Essay Writing Sanskrit');

-- 16. Spot Photography
UPDATE public.events 
SET description = 'Theme announced on the spot. Only camera/mobile allowed. Editing not permitted. Photos must be taken within campus. One photo submission only.'
WHERE name = 'Spot Photography';
