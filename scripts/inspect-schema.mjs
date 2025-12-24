
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspect() {
    console.log('🔍 Inspecting Schema...');

    // 1. Check 'events' table
    const { data: events, error: eventsError } = await supabase
        .from('events')
        .select('*')
        .limit(1);

    if (eventsError) {
        console.log("❌ 'events' table check failed:", eventsError.message);
    } else if (events && events.length > 0) {
        console.log("✅ 'events' table exists. Columns:", Object.keys(events[0]).join(', '));
    } else {
        console.log("✅ 'events' table exists (but is empty).");
    }

    // 2. Check 'sports' table
    const { data: sports, error: sportsError } = await supabase
        .from('sports')
        .select('*')
        .limit(1);

    if (sportsError) {
        console.log("❌ 'sports' table check failed (Expected):", sportsError.message);
    } else {
        console.log("⚠️ 'sports' table exists! Columns:", sports && sports.length > 0 ? Object.keys(sports[0]).join(', ') : 'Empty');
    }

    // 3. Check 'registrations' table columns
    const { data: regs, error: regsError } = await supabase
        .from('registrations')
        .select('*')
        .limit(1);

    if (regsError) {
        console.log("❌ 'registrations' table check failed:", regsError.message);
    } else if (regs && regs.length > 0) {
        console.log("✅ 'registrations' table columns:", Object.keys(regs[0]).join(', '));
    } else {
        console.log("✅ 'registrations' table exists (but is empty). Cannot determine columns.");
    }
}

inspect();
