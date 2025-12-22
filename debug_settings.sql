-- Debug script to check settings table data
-- Run this in Supabase SQL Editor

-- Check what's currently in the settings table
SELECT 
    key, 
    value,
    value::text as value_text,
    updated_at,
    updated_by
FROM public.settings 
WHERE key IN ('max_on_stage_registrations', 'max_off_stage_registrations')
ORDER BY key;

-- Check the JSON structure
SELECT 
    key,
    value->'limit' as limit_value,
    (value->>'limit')::int as limit_as_int
FROM public.settings 
WHERE key IN ('max_on_stage_registrations', 'max_off_stage_registrations');
