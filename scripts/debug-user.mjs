
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
console.log('Loading env from:', path.resolve(__dirname, '../.env.example'));
dotenv.config({ path: path.resolve(__dirname, '../.env.example') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !supabaseSecretKey) {
    console.error('Missing SUPABASE_URL or SUPABASE_SECRET_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseSecretKey);

async function debugUser(rollNumber) {
    console.log(`\n🔍 Debugging User: ${rollNumber}`);

    const upperEmail = `noreply-${rollNumber.toUpperCase()}@ekc.edu.in`;
    const lowerEmail = `noreply-${rollNumber.toLowerCase()}@ekc.edu.in`;

    console.log(`Checking Email (Upper): ${upperEmail}`);
    console.log(`Checking Email (Lower): ${lowerEmail}`);

    // Check Upper
    const { data: dataUpper, error: errorUpper } = await supabase.auth.admin.listUsers();
    const userUpper = dataUpper.users.find(u => u.email.toLowerCase() === upperEmail.toLowerCase());

    if (userUpper) {
        console.log(`\n✅ Found User!`);
        console.log(`   ID: ${userUpper.id}`);
        console.log(`   Email: ${userUpper.email}  <-- EXACT CASING IN DB`);
        console.log(`   Metadata:`, userUpper.user_metadata);

        // Force Reset Password
        const newPassword = rollNumber.toLowerCase();
        console.log(`\n🔄 Resetting password to: ${newPassword}`);

        const { error: updateError } = await supabase.auth.admin.updateUserById(
            userUpper.id,
            { password: newPassword }
        );

        if (updateError) {
            console.error('   ❌ Password Reset Failed:', updateError.message);
        } else {
            console.log('   ✅ Password Reset Successful!');
        }
    } else {
        console.error('\n❌ User not found in Auth database with either email casing.');
    }
}

debugUser('ekc22cs051');
