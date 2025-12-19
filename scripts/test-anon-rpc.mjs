
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

// Manually load .env to ensure we get the right keys
const envConfig = dotenv.parse(fs.readFileSync('.env'));
const supabaseUrl = envConfig.SUPABASE_URL;
// Tries to find the ANON key specifically (Vite uses Publishable Key)
const supabaseAnonKey = envConfig.VITE_SUPABASE_PUBLISHABLE_KEY || envConfig.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('❌ Missing SUPABASE_url or ANON key in .env');
    console.log('Available keys:', Object.keys(envConfig));
    process.exit(1);
}

// Create client with ANON key - simulating the browser!
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testAnonRpc() {
    const rollNumber = 'EKC22CS051';
    console.log(`🧪 Testing RPC as ANONYMOUS user for: ${rollNumber}`);

    const { data, error } = await supabase
        .rpc('get_student_login_email', { p_roll_number: rollNumber });

    if (error) {
        console.error('❌ ANONYMOUS RPC Failed:', error);
        console.log('👉 This means the browser cannot verify the roll number.');
        console.log('   Fix: Run the GRANT EXECUTE ... TO anon SQL again.');
    } else {
        console.log('✅ ANONYMOUS RPC Success:', data);
        if (!data) console.warn('⚠️  RPC returned null (Student not found or logic error)');
        else console.log('   (Browser should be able to see this)');
    }
}

testAnonRpc();
