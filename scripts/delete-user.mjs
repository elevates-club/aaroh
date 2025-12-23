
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
console.log('Loading env from:', path.resolve(__dirname, '../.env'));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !supabaseSecretKey) {
    console.error('Missing SUPABASE_URL or SUPABASE_SECRET_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseSecretKey);

async function deleteUser(email) {
    console.log(`\n🗑️  Attempting to delete user: ${email}`);

    // 1. Find User content
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
    if (listError) {
        console.error('Error listing users:', listError);
        return;
    }

    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());

    if (!user) {
        console.error(`❌ User not found with email: ${email}`);
        return;
    }

    const userId = user.id;
    console.log(`✅ Found User ID: ${userId}`);

    // 2. Delete Activity Logs
    const { error: logsError } = await supabase.from('activity_logs').delete().eq('user_id', userId);
    if (logsError) console.error('Error deleting logs:', logsError.message);
    else console.log('   Deleted activity_logs');

    // 3. Find Student Record
    const { data: student } = await supabase.from('students').select('id').eq('user_id', userId).single();

    if (student) {
        console.log(`   Found Student ID: ${student.id}`);

        // 4. Delete Team Members (via Registrations)
        // Fetch registrations
        const { data: regs } = await supabase.from('registrations').select('id').eq('student_id', student.id);
        if (regs && regs.length > 0) {
            const regIds = regs.map(r => r.id);
            const { error: teamError } = await supabase.from('team_members').delete().in('registration_id', regIds);
            if (teamError) console.error('Error deleting team members:', teamError.message);
            else console.log(`   Deleted team_members for ${regIds.length} registrations`);
        }

        // 5. Delete Registrations
        const { error: regError } = await supabase.from('registrations').delete().eq('student_id', student.id);
        if (regError) console.error('Error deleting registrations:', regError.message);
        else console.log('   Deleted registrations');

        // 6. Delete Student
        const { error: studError } = await supabase.from('students').delete().eq('id', student.id);
        if (studError) console.error('Error deleting student:', studError.message);
        else console.log('   Deleted student record');
    } else {
        console.log('   No linked student record found.');
    }

    // 7. Delete Profile
    const { error: profError } = await supabase.from('profiles').delete().eq('id', userId);
    if (profError) console.error('Error deleting profile:', profError.message);
    else console.log('   Deleted profile');

    // 8. Delete Auth User
    const { error: authError } = await supabase.auth.admin.deleteUser(userId);
    if (authError) {
        console.error('❌ Failed to delete Auth User:', authError.message);
    } else {
        console.log('✅ Successfully deleted Auth User table record!');
    }
}

// Get email from arg
const targetEmail = process.argv[2];
if (!targetEmail) {
    console.error('Please provide an email. Example: node scripts/delete-user.mjs user@example.com');
} else {
    deleteUser(targetEmail);
}
