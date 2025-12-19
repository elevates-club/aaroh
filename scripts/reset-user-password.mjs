
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SECRET_KEY; // Admin key required

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing env vars');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function resetPassword() {
    const rollNumber = 'EKC22CS051';
    console.log(`🔐 Resetting password for: ${rollNumber}`);

    // 1. Get User ID
    const { data: students, error: sErr } = await supabase
        .from('students')
        .select('user_id')
        .eq('roll_number', rollNumber)
        .single();

    if (sErr || !students) {
        console.error('❌ Student not found:', sErr);
        return;
    }

    const userId = students.user_id;
    const newPassword = 'TestPassword123!';

    // 2. Update Password
    const { data, error } = await supabase.auth.admin.updateUserById(
        userId,
        { password: newPassword }
    );

    if (error) {
        console.error('❌ Error resetting password:', error);
    } else {
        console.log('✅ Password Reset Successfully!');
        console.log('--------------------------------------------------');
        console.log(`👤 User: ${rollNumber}`);
        console.log(`🔑 New Password: ${newPassword}`);
        console.log('--------------------------------------------------');
    }
}

resetPassword();
