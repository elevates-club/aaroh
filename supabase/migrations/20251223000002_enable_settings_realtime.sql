-- Migration: Enable Realtime on Settings Table
-- Description: Enables realtime notifications for settings table changes so Student Dashboard can receive live updates

-- Enable realtime for the settings table
ALTER PUBLICATION supabase_realtime ADD TABLE settings;

-- Verify realtime is enabled
-- You can check this in Supabase Dashboard > Database > Publications
-- Or run: SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
