#!/usr/bin/env node

/**
 * API Endpoint: Update Student Auth Email
 * 
 * This script provides an endpoint to update auth.users email
 * when students complete their profile setup.
 * 
 * For production, this should be a proper API endpoint (Netlify/Vercel/Express)
 * For now, this is a CLI script that can be called manually
 * 
 * Usage:
 * node scripts/update-auth-email.mjs USER_ID NEW_EMAIL
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

const [userId, newEmail] = process.argv.slice(2);

if (!userId || !newEmail) {
    console.error('❌ Usage: node update-auth-email.mjs USER_ID NEW_EMAIL');
    console.error('Example: node update-auth-email.mjs abc-123-def student@gmail.com');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
});

async function updateAuthEmail() {
    console.log(`🔄 Updating auth email for user: ${userId}`);
    console.log(`📧 New email: ${newEmail}\n`);

    try {
        // Update auth.users email
        const { data, error } = await supabase.auth.admin.updateUserById(userId, {
            email: newEmail,
            email_confirm: true // Auto-confirm new email
        });

        if (error) {
            console.error('❌ Failed to update auth email:', error.message);
            return;
        }

        console.log('✅ Auth email updated successfully!');
        console.log(`   User can now login with:`);
        console.log(`   - Register number (converts to system email)`);
        console.log(`   - ${newEmail} (new email)`);

    } catch (error) {
        console.error('💥 Error:', error);
    }
}

updateAuthEmail()
    .then(() => process.exit(0))
    .catch(error => {
        console.error('💥 Script failed:', error);
        process.exit(1);
    });
