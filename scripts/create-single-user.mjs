
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

async function createSingleUser(rollNumber) {
    console.log(`\nCreating User: ${rollNumber}`);
    const lcRoll = rollNumber.toLowerCase();

    // 1. Check if student exists in public.students
    const { data: student, error: fetchError } = await supabase
        .from('students')
        .select('*')
        .ilike('roll_number', rollNumber)
        .single();

    if (fetchError || !student) {
        console.error('❌ Student not found in public.students table!');
        console.log('   Starting fresh student creation flow...');
        // Create dummy student if needed? No, we should probably fail or ask user.
        // Actually, let's just create the auth user and let the trigger handle it
        // But the trigger relies on metadata.
    } else {
        console.log(`✅ Found Student in DB: ${student.name}`);
    }

    // Explicit override for this specific request if student not found in DB
    const name = student ? student.name : 'SARHAN QADIR KVM';
    const email = `noreply-${rollNumber.toUpperCase()}@ekc.edu.in`; // AuthContext uses UPPERCASE logic for email generation
    const password = lcRoll;

    console.log(`\nCreating Auth User...`);
    console.log(`   Email: ${email}`);
    console.log(`   Name: ${name}`);
    console.log(`   Password: ${password}`);

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: email,
        password: password,
        email_confirm: true,
        user_metadata: {
            roll_number: rollNumber.toUpperCase(),
            name: name,
            full_name: name,
            is_student: true,
            role: 'student' // Explicitly set role for new trigger
        }
    });

    if (authError) {
        if (authError.message.includes('already been registered')) {
            console.log('⚠️  User already exists. Updating password...');
            // Need to find user ID first to update
            const { data: { users } } = await supabase.auth.admin.listUsers({ perPage: 1000 });

            // Try precise match first
            let existingUser = users.find(u => u.email.toLowerCase() === email.toLowerCase());

            if (existingUser) {
                console.log(`   Found existing user ID: ${existingUser.id}`);
                const { error: updateError } = await supabase.auth.admin.updateUserById(
                    existingUser.id,
                    {
                        password: password,
                        user_metadata: {
                            roll_number: rollNumber.toUpperCase(),
                            name: name,
                            full_name: name,
                            is_student: true,
                            role: 'student'
                        }
                    }
                );

                if (updateError) {
                    console.error('❌ Update Failed:', updateError.message);
                } else {
                    console.log('✅ User Updated Successfully!');

                    // Force link to student record
                    if (student) {
                        console.log('   Linking to student record...');
                        const { error: linkError } = await supabase
                            .from('students')
                            .update({ user_id: existingUser.id })
                            .eq('id', student.id);

                        if (linkError) console.error('   ❌ Link Error:', linkError.message);
                        else console.log('   ✅ Linked to student table');
                    }
                }
            } else {
                console.error('❌ Could not find user object even though error said registered.');
            }
        } else {
            console.error('❌ Auth Creation Failed:', authError.message);
        }
    } else {
        console.log('✅ Auth User Created Successfully!');
        console.log('   ID:', authData.user.id);

        // Link manually just in case trigger fails or race condition
        if (student) {
            console.log('   Linking to student record...');
            const { error: linkError } = await supabase
                .from('students')
                .update({ user_id: authData.user.id })
                .eq('id', student.id);

            if (linkError) console.error('   ❌ Link Error:', linkError.message);
            else console.log('   ✅ Linked to student table');
        }
    }
}

createSingleUser('EKC22CS051');
