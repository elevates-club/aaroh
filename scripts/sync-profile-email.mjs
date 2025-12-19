
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing env vars');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function syncProfileEmail() {
    const rollNumber = 'EKC22CS051';
    console.log(`🔄 Syncing profile email for: ${rollNumber}`);

    // 1. Get student data to find user_id
    const { data: student, error: studentError } = await supabase
        .from('students')
        .select('user_id')
        .eq('roll_number', rollNumber)
        .single();

    if (studentError || !student?.user_id) {
        console.error('❌ Student not found:', studentError);
        return;
    }

    const userId = student.user_id;
    console.log('   Found User ID:', userId);

    // 2. Get actual email from auth.users
    const { data: { user }, error: authError } = await supabase.auth.admin.getUserById(userId);

    if (authError || !user) {
        console.error('❌ Auth user not found:', authError);
        return;
    }

    const authEmail = user.email;
    console.log('   Auth Email:', authEmail);

    // 3. Update profiles table
    const { error: updateError } = await supabase
        .from('profiles')
        .update({ email: authEmail })
        .eq('user_id', userId);

    if (updateError) {
        console.error('❌ Failed to update profile:', updateError);
    } else {
        console.log('✅ Profile email synced to:', authEmail);
    }
}

syncProfileEmail();
