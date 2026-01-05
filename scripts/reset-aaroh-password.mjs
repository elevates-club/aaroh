
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Try to load .env from root
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SECRET_KEY; // Admin key required

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing env vars. SUPABASE_URL or SUPABASE_SECRET_KEY not found.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function resetPassword() {
    const targetEmail = 'aaroh@ekc.edu.in';
    const newPassword = '123456';

    console.log(`🔐 Attempting to reset password for: ${targetEmail}`);

    // listUsers defaults to 50 users per page. If there are more, we might miss it. 
    // But assuming strict filtering isn't available on listUsers by email in older versions? 
    // Actually listUsers causes pagination. 
    // Ideally we iterate or filter. But wait, we can't search by email in listUsers easily without getting all.
    // However, we can use simple pagination to find it.

    // Actually, checking if listUsers supports email filter? No.
    // But we can try to fetch all (up to a limit) or just verify.

    // Better approach: Use maybe `supabase.from('auth.users')`? No, no access.

    // Let's try listing users. If there are thousands, this is bad. 
    // But most projects here are small.
    let page = 1;
    let foundUser = null;

    while (true) {
        const { data: { users }, error } = await supabase.auth.admin.listUsers({ page: page, perPage: 1000 });
        if (error) {
            console.error('Error listing users:', error);
            return;
        }
        if (!users || users.length === 0) break;

        foundUser = users.find(u => u.email === targetEmail);
        if (foundUser) break;

        page++;
    }

    if (!foundUser) {
        console.error(`❌ User with email ${targetEmail} not found in Auth users.`);
        return;
    }

    console.log(`✅ Found user: ${foundUser.id}`);

    // Update Password
    const { data, error } = await supabase.auth.admin.updateUserById(
        foundUser.id,
        { password: newPassword }
    );

    if (error) {
        console.error('❌ Error resetting password:', error);
    } else {
        console.log('--------------------------------------------------');
        console.log(`✅ Password Reset Successfully!`);
        console.log(`👤 User: ${targetEmail}`);
        console.log(`🔑 New Password: ${newPassword}`);
        console.log('--------------------------------------------------');
    }
}

resetPassword();
