
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials in .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixUsers() {
    console.log('🔧 Starting User Cleanup & Fix...');

    // 1. Fetch All Auth Users
    const { data: { users }, error: authError } = await supabase.auth.admin.listUsers({ page: 1, perPage: 2000 });
    if (authError) return console.error('Auth fetch error:', authError);
    console.log(`\n🔐 Total Auth Users: ${users.length}`);

    // 2. Fetch All Students
    const { data: students, error: studentError } = await supabase.from('students').select('id, roll_number, user_id');
    if (studentError) return console.error('Student fetch error:', studentError);
    console.log(`👨‍🎓 Total Students: ${students.length}`);

    // CONFIG
    const staffEmails = ['admin@elevates.com', 'coordinator@aaroh.com'];
    const linkedUserIds = new Set(students.map(s => s.user_id).filter(Boolean));
    const unclaimedStudents = students.filter(s => !s.user_id);

    console.log(`⚠️ Unclaimed Students: ${unclaimedStudents.length}`);

    // 3. Identify Categories
    const toRelink = [];
    const toDelete = [];

    users.forEach(u => {
        // Skip Staff
        if (staffEmails.includes(u.email)) return;
        if (u.user_metadata?.role && u.user_metadata.role !== 'student') return;

        // Skip Already Linked
        if (linkedUserIds.has(u.id)) return;

        // Try to Match with Unclaimed Student
        const match = u.email.match(/noreply-([a-zA-Z0-9]+)@/i);
        if (match) {
            const roll = match[1].toUpperCase();
            const student = unclaimedStudents.find(s => s.roll_number?.toUpperCase() === roll);
            if (student) {
                // FOUND MATCH -> RELINK
                toRelink.push({ userId: u.id, studentId: student.id, roll: student.roll_number, email: u.email });
                return;
            }
        }

        // NO MATCH -> GARBAGE
        toDelete.push(u);
    });

    console.log(`\n📋 ANALYSIS RESULTS:`);
    console.log(`   🔗 To Relink: ${toRelink.length} accounts`);
    console.log(`   🗑️ To Delete: ${toDelete.length} garbage accounts`);

    // 4. EXECUTE FIXES
    /* 
    // SKIPPED BY USER REQUEST
    if (toRelink.length > 0) {
        console.log(`\n🚀 Relinking ${toRelink.length} accounts...`);
        let linkedCount = 0;
        for (const item of toRelink) {
            const { error } = await supabase
                .from('students')
                .update({ user_id: item.userId })
                .eq('id', item.studentId);
            
            if (error) console.error(`Failed to link ${item.roll}:`, error);
            else {
                linkedCount++;
                if (linkedCount % 50 === 0) process.stdout.write('.');
            }
        }
        console.log(`\n✅ Successfully Relinked: ${linkedCount}`);
    }
    */

    if (toDelete.length > 0) {
        console.log(`\n🔥 Deleting ${toDelete.length} garbage accounts...`);
        let deletedCount = 0;
        for (const u of toDelete) {
            const { error } = await supabase.auth.admin.deleteUser(u.id);
            if (error) console.error(`Failed to delete ${u.email}:`, error);
            else {
                deletedCount++;
                if (deletedCount % 50 === 0) process.stdout.write('.');
            }
        }
        console.log(`\n✅ Successfully Deleted: ${deletedCount}`);
    }

    console.log('\n✨ Cleanup Complete!');
}

fixUsers();
