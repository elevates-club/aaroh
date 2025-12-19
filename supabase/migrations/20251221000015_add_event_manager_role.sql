-- Add event_manager to user_role enum
-- This must be committed before it can be used in policies
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'event_manager';
