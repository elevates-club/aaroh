
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !supabaseSecretKey) {
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseSecretKey);

async function checkUser(rollNumber) {
    const { data: { users } } = await supabase.auth.admin.listUsers({ perPage: 1000 });

    // Find by metadata roll number matches
    const user = users.find(u =>
        u.user_metadata?.roll_number?.toLowerCase() === rollNumber.toLowerCase()
    );

    console.log(`\n🔍 Checking User: ${rollNumber}`);
    if (user) {
        console.log(`   ID: ${user.id}`);
        console.log(`   Current Login Email: ${user.email}`);
        console.log(`   New Email Pending? : ${user.email_change ? user.email_change : 'No'}`);
        console.log(`   Email Confirmed At : ${user.email_confirmed_at}`);
        console.log(`   Metadata Name: ${user.user_metadata.name}`);
        console.log(`   Metadata Email: ${user.user_metadata.email}`); // Some setups verify this
    } else {
        console.log('   ❌ User not found by roll number metadata.');
    }
}

checkUser('ekc22cs051');
