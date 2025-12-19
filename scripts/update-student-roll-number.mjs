#!/usr/bin/env node

/**
 * Admin Script: Update Student Roll Number
 * 
 * Updates a student's roll number across the entire system:
 * - students table
 * - profiles table
 * - auth.users table
 * - resets password if student hasn't logged in yet
 * 
 * Usage:
 * node scripts/update-student-roll-number.mjs OLD_ROLL NEW_ROLL
 * 
 * Example:
 * node scripts/update-student-roll-number.mjs 3514 3514A
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabasePublishableKey = process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !supabasePublishableKey) {
    console.error('❌ SUPABASE_URL and SUPABASE_SECRET_KEY environment variables are required');
    console.log('Get your publishable key from: https://supabase.com/dashboard/project/legelqhwyyrdkmxiigcu/settings/api');
    console.log('Look for the key starting with: sb_secret_');
    process.exit(1);
}

const [oldRoll, newRoll] = process.argv.slice(2);

if (!oldRoll || !newRoll) {
    console.error('❌ Usage: node update-student-roll-number.mjs OLD_ROLL NEW_ROLL');
    console.error('Example: node update-student-roll-number.mjs 3514 3514A');
    process.exit(1);
}

// Create admin client
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function updateStudentRollNumber() {
    console.log(`🔄 Updating roll number: ${oldRoll} → ${newRoll}\n`);

    try {
        // Step 1: Call database function to update students and profiles tables
        const { data: dbResult, error: dbError } = await supabase
            .rpc('admin_update_student_roll_number', {
                p_old_roll_number: oldRoll,
                p_new_roll_number: newRoll
            });

        if (dbError) {
            console.error('❌ Database update failed:', dbError.message);
            return;
        }

        if (!dbResult.success) {
            console.error('❌', dbResult.message);
            return;
        }

        console.log('✅ Database updated successfully');
        console.log(`   Student ID: ${dbResult.user_id}`);
        console.log(`   Old email: ${dbResult.old_email}`);
        console.log(`   New email: ${dbResult.new_email}`);
        console.log(`   First login: ${dbResult.is_first_login}\n`);

        // Step 2: Update auth.users email
        const { data: userData, error: userError } = await supabase.auth.admin.updateUserById(
            dbResult.user_id,
            {
                email: dbResult.new_email,
                user_metadata: {
                    roll_number: newRoll
                }
            }
        );

        if (userError) {
            console.error('⚠️  Email update failed:', userError.message);
            console.log('   Please manually update email in Supabase dashboard');
        } else {
            console.log('✅ Auth email updated successfully');
        }

        // Step 3: Reset password if student hasn't logged in yet
        if (dbResult.is_first_login) {
            const { error: passwordError } = await supabase.auth.admin.updateUserById(
                dbResult.user_id,
                { password: newRoll }
            );

            if (passwordError) {
                console.error('⚠️  Password reset failed:', passwordError.message);
                console.log(`   Student hasn't logged in yet. Please manually reset password to: ${newRoll}`);
            } else {
                console.log('✅ Password reset to new roll number');
            }
        } else {
            console.log('ℹ️  Student has already changed password - no reset needed');
        }

        console.log('\n✨ Roll number update complete!');
        console.log(`\n📝 Summary:`);
        console.log(`   Old: ${oldRoll}`);
        console.log(`   New: ${newRoll}`);
        console.log(`   Student can now login with: ${newRoll}`);
        if (dbResult.is_first_login) {
            console.log(`   Initial password: ${newRoll} (will be forced to change)`);
        }

    } catch (error) {
        console.error('💥 Unexpected error:', error);
    }
}

updateStudentRollNumber()
    .then(() => process.exit(0))
    .catch(error => {
        console.error('💥 Script failed:', error);
        process.exit(1);
    });
