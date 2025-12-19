
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

// Load .env manually to get both keys
const envConfig = dotenv.parse(fs.readFileSync('.env'));
const supabaseUrl = envConfig.SUPABASE_URL;
// Use the SAME key as the browser (anon/publishable)
const supabaseAnonKey = envConfig.VITE_SUPABASE_PUBLISHABLE_KEY || envConfig.SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('❌ Missing SUPABASE_URL or Anon/Publishable Key');
    console.log('Available keys:', Object.keys(envConfig));
    process.exit(1);
}

// Simulate browser client
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testLoginFlow() {
    const rollNumber = 'EKC22CS051';
    const password = 'TestPassword123!';

    console.log('='.repeat(60));
    console.log('🧪 SIMULATING BROWSER LOGIN FLOW');
    console.log('='.repeat(60));
    console.log(`   Roll Number: ${rollNumber}`);
    console.log(`   Password: ${password}`);
    console.log('');

    // Step 1: Lookup email (exactly like AuthContext does)
    console.log('📍 Step 1: Lookup actual email via RPC...');
    const { data: realEmail, error: lookupError } = await supabase
        .rpc('get_student_login_email', { p_roll_number: rollNumber });

    if (lookupError) {
        console.error('❌ RPC FAILED:', lookupError);
        console.log('   (Browser would fallback to noreply- email)');
    } else {
        console.log('✅ RPC Success. Email found:', realEmail);
    }

    const loginEmail = realEmail || `noreply-${rollNumber.toUpperCase()}@ekc.edu.in`;
    console.log(`   → Login Email to use: ${loginEmail}`);
    console.log('');

    // Step 2: Attempt login
    console.log('📍 Step 2: Calling supabase.auth.signInWithPassword...');
    const { data, error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: password
    });

    if (error) {
        console.error('❌ LOGIN FAILED:', error.message);
        console.error('   Status:', error.status);
        console.error('   Code:', error.code);
    } else {
        console.log('✅ LOGIN SUCCESS!');
        console.log('   User ID:', data.user?.id);
        console.log('   Email:', data.user?.email);
    }
    console.log('='.repeat(60));
}

testLoginFlow();
