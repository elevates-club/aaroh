-- Migration: Fix RLS for settings table
-- Purpose: Ensure students can read dynamic settings (quota limits).

ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- Allow everyone (authenticated users) to view settings
DROP POLICY IF EXISTS "Everyone can view settings" ON public.settings;
CREATE POLICY "Everyone can view settings" 
ON public.settings FOR SELECT 
TO authenticated 
USING (true);

-- Allow admins to manage settings (insert/update/delete)
DROP POLICY IF EXISTS "Admins can manage settings" ON public.settings;
CREATE POLICY "Admins can manage settings" 
ON public.settings FOR ALL 
TO authenticated 
USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin')
);
