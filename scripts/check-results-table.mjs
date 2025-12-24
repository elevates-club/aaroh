
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTable() {
    console.log("Checking if 'event_results' table exists...");

    // Attempt to select from the table. 
    // If it doesn't exist, Supabase/Postgrest usually returns an error 404 or 42P01 (relation does not exist)
    const { data, error } = await supabase.from('event_results').select('count', { count: 'exact', head: true });

    if (error) {
        console.error("❌ Table check failed:", error.message);
        console.error("The table 'event_results' likely does not exist yet.");
        process.exit(1);
    } else {
        console.log("✅ Table 'event_results' exists!");
        process.exit(0);
    }
}

checkTable();
