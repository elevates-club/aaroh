
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

async function createNewStudent(name, rollNumber, year, department) {
    console.log(`\nProcessing Student: ${name} (${rollNumber})`);

    // 1. Insert/Get Student Record
    console.log('1. Checking/Creating Student Record...');
    let { data: student, error: fetchError } = await supabase
        .from('students')
        .select('*')
        .ilike('roll_number', rollNumber)
        .single();

    if (!student) {
        console.log('   Student not found. Creating new record...');
        const { data: newStudent, error: createError } = await supabase
            .from('students')
            .insert([{
                name: name,
                roll_number: rollNumber.toUpperCase(),
                year: year,
                department: department
            }])
            .select()
            .single();

        if (createError) {
            console.error('   ❌ Failed to create student record:', createError.message);
            return;
        }
        student = newStudent;
        console.log('   ✅ Student record created successfully.');
    } else {
        console.log('   ✅ Student record already exists.');
    }

    // 2. Create Auth User
    console.log('2. Creating Auth User...');
    const email = `noreply-${rollNumber.toUpperCase()}@ekc.edu.in`;
    const password = rollNumber.toLowerCase();

    console.log(`   Email: ${email}`);
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
            role: 'student'
        }
    });

    if (authError) {
        if (authError.message.includes('already been registered')) {
            console.log('   ⚠️  Auth user already exists. Updating details...');
            const { data: { users } } = await supabase.auth.admin.listUsers();
            const existingUser = users.find(u => u.email.toLowerCase() === email.toLowerCase());

            if (existingUser) {
                await supabase.auth.admin.updateUserById(existingUser.id, {
                    password: password,
                    user_metadata: {
                        roll_number: rollNumber.toUpperCase(),
                        name: name,
                        full_name: name,
                        is_student: true,
                        role: 'student'
                    }
                });

                // Link
                await supabase
                    .from('students')
                    .update({ user_id: existingUser.id })
                    .eq('id', student.id);

                console.log('   ✅ User updated and linked.');
            }
        } else {
            console.error('   ❌ Auth Error:', authError.message);
        }
    } else {
        console.log('   ✅ Auth user created.');
        // Link
        await supabase
            .from('students')
            .update({ user_id: authData.user.id })
            .eq('id', student.id);
        console.log('   ✅ Linked to student record.');
    }
}

// Run for Rahna nk
createNewStudent('Rahna nk', 'LEKC22CE037', 'third', 'CE');
