#!/usr/bin/env node

/**
 * Bulk Student Account Creation Script
 * 
 * This script creates auth.users entries for all students in the students table
 * using Supabase Admin SDK
 * 
 * Prerequisites:
 * - npm install @supabase/supabase-js
 * - Set environment variables: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 * 
 * Usage:
 * node scripts/create-student-accounts.js
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !supabaseSecretKey) {
    console.error('❌ SUPABASE_URL and SUPABASE_SECRET_KEY environment variables are required');
    console.log('Get your SECRET key from: https://supabase.com/dashboard/project/legelqhwyyrdkmxiigcu/settings/api');
    console.log('Look for the key starting with: sb_secret_');
    console.log('⚠️  Note: Use SECRET key (not publishable) for admin operations');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseSecretKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function createStudentAccounts() {
    console.log('🚀 Starting bulk student account creation...\n');

    // Fetch all students without user_id
    const { data: students, error: fetchError } = await supabase
        .from('students')
        .select('*')
        .is('user_id', null);

    if (fetchError) {
        console.error('❌ Error fetching students:', fetchError);
        return;
    }

    if (!students || students.length === 0) {
        console.log('✅ No students found without accounts. All done!');
        return;
    }

    console.log(`📊 Found ${students.length} students to create accounts for\n`);

    let successCount = 0;
    let errorCount = 0;

    for (const student of students) {
        try {
            // Ensure strict casing conventions
            const rollUpper = student.roll_number.toUpperCase();
            const rollLower = student.roll_number.toLowerCase();

            // Create auth user - students login with ROLL NUMBER, not email
            // System email is hidden, real email goes in students.email during profile setup
            const { data: authData, error: authError } = await supabase.auth.admin.createUser({
                email: `noreply-${rollUpper}@ekc.edu.in`, // Force UPPERCASE for email match
                password: rollLower, // Force LOWERCASE for password
                email_confirm: true, // Auto-confirm email
                user_metadata: {
                    roll_number: rollUpper, // Metadata always UPPER
                    name: student.name,
                    full_name: student.name,
                    is_student: true
                }
            });

            if (authError) {
                console.error(`❌ ${student.roll_number}: Auth error -`, authError.message);
                console.error('   Details:', {
                    code: authError.code,
                    status: authError.status,
                    name: authError.name
                });
                errorCount++;
                continue;
            }

            // Link student to auth user
            const { error: linkError } = await supabase.rpc('link_student_to_auth_user', {
                p_roll_number: student.roll_number,
                p_user_id: authData.user.id
            });

            if (linkError) {
                console.error(`⚠️  ${student.roll_number}: Created auth, but link failed: ${linkError.message}`);
                errorCount++;
                continue;
            }

            console.log(`✅ ${student.roll_number} (${student.name})`);
            successCount++;

        } catch (error) {
            console.error(`❌ ${student.roll_number}: ${error.message}`);
            errorCount++;
        }
    }

    console.log(`\n📊 Summary:`);
    console.log(`   ✅ Success: ${successCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);
    console.log(`   📝 Total: ${students.length}`);
}

// Run the script
createStudentAccounts()
    .then(() => {
        console.log('\n✨ Script completed!');
        process.exit(0);
    })
    .catch(error => {
        console.error('\n💥 Script failed:', error);
        process.exit(1);
    });
