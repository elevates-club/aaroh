
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
// Force ANON key to test public access (like browser)
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing env vars');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testRpc() {
    const rollNumber = 'EKC22CS051';
    console.log(`Testing RPC for roll number: ${rollNumber}`);

    const { data, error } = await supabase.rpc('get_student_login_email', { p_roll_number: rollNumber });

    if (error) {
        console.error('RPC Error:', error);
        console.log('💡 TIP: This likely means you haven\'t run the SQL migration yet.');
    } else {
        console.log('RPC Result:', data);
        if (!data) {
            console.log('⚠️  RPC returned null. Student might not exist or logic is wrong.');
        } else {
            console.log(`✅ RPC returned email: ${data}`);
        }
    }
}

testRpc();
