
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

async function cleanStudentDependencies(studentId) {
    // 1. Find Registrations
    const { data: regs } = await supabase.from('registrations').select('id').eq('student_id', studentId);

    if (regs && regs.length > 0) {
        const regIds = regs.map(r => r.id);

        // 2. Delete Team Members
        const { error: teamError } = await supabase.from('team_members').delete().in('registration_id', regIds);
        if (teamError) console.error(`   Error deleting team members`, teamError.message);

        // 3. Delete Registrations
        const { error: regError } = await supabase.from('registrations').delete().eq('student_id', studentId);
        if (regError) console.error(`   Error deleting registrations`, regError.message);
    }
}

async function deleteAuthAndProfile(userId) {
    if (!userId) return;

    // 1. Delete Activity Logs
    await supabase.from('activity_logs').delete().eq('user_id', userId);

    // 2. Delete Profile
    await supabase.from('profiles').delete().eq('id', userId);

    // 3. Delete Auth User
    const { error } = await supabase.auth.admin.deleteUser(userId);
    if (error) console.error(`   ❌ Auth Delete Error: ${error.message}`);
    else console.log(`   ✅ Auth User Deleted`);
}

async function run() {
    console.log('🔍 Searching for First Year Students...');

    const { data: students, error } = await supabase
        .from('students')
        .select('*')
        .eq('year', 'first'); // Using 'first' based on schema

    if (error) {
        console.error('Error fetching students:', error);
        return;
    }

    if (!students || students.length === 0) {
        console.log('No first year students found.');
        return;
    }

    console.log(`Found ${students.length} students to delete.`);

    let count = 0;
    for (const student of students) {
        console.log(`\nDeleting [${++count}/${students.length}]: ${student.roll_number} - ${student.name}`);

        // 1. Clean dependencies linked to Student ID
        await cleanStudentDependencies(student.id);

        // 2. Delete Auth Account and Profile (linked to User ID)
        if (student.user_id) {
            await deleteAuthAndProfile(student.user_id);
        } else {
            console.log('   No Auth User linked.');
        }

        // 3. Finally Delete Student Record
        const { error: delError } = await supabase.from('students').delete().eq('id', student.id);

        if (delError) console.error(`   ❌ Error deleting student record: ${delError.message}`);
        else console.log(`   ✅ Student Record Deleted`);
    }

    console.log('\n✨ Batch Deletion Complete!');
}

run();
