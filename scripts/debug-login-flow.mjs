
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SECRET_KEY; // Use admin key to see everything

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing env vars');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugLogin() {
    const rollInput = 'EKC22CS051';
    console.log(`🔎 Debugging for Roll Number: ${rollInput}`);

    // 1. Check raw students table
    const { data: students, error: studentError } = await supabase
        .from('students')
        .select('id, roll_number, user_id, name')
        .ilike('roll_number', rollInput); // Case-insensitive search to find whatever is there

    if (studentError) {
        console.error('❌ Error finding student:', studentError);
    } else if (!students || students.length === 0) {
        console.error('❌ No student found in "students" table!');
    } else {
        console.log('✅ Found student(s) in DB:', students);

        const student = students[0];
        if (!student.user_id) {
            console.error('❌ Student is NOT linked to any Auth User (user_id is NULL). RPC will fail.');
        } else {
            console.log('🔗 Linked User ID:', student.user_id);

            // 2. Check Auth User
            const { data: { user }, error: authError } = await supabase.auth.admin.getUserById(student.user_id);
            if (authError || !user) {
                console.error('❌ Auth User not found for this ID:', authError);
            } else {
                console.log('👤 Auth User Email:', user.email);
                console.log('   Expected Login Email:', user.email);
            }
        }
    }

    // 3. Test RPC exactly as AuthContext does
    console.log('\n🧪 Testing RPC (get_student_login_email)...');
    const { data: rpcResult, error: rpcError } = await supabase.rpc('get_student_login_email', { p_roll_number: rollInput });

    if (rpcError) console.error('❌ RPC Error:', rpcError);
    else console.log('👉 RPC Result:', rpcResult);

}

debugLogin();
