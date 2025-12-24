
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

async function analyzeUsers() {
    console.log('🔍 Analyzing Users & Profiles...');

    // 1. Get count from profiles
    const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('*');

    if (profileError) {
        console.error('Error fetching profiles:', profileError);
        return;
    }

    console.log(`\n📊 Total Profiles in DB: ${profiles.length}`);

    // 2. Break down by Role
    const roleCounts = {};
    profiles.forEach(p => {
        const role = p.role || 'unknown';
        roleCounts[role] = (roleCounts[role] || 0) + 1;
    });

    console.log('\n👥 Profiles by Role:');
    console.table(roleCounts);

    // 3. Check for duplicates (if any field allows it, though UUIDs describe uniqueness)
    // Let's check duplicate emails if available in metadata (requires admin access to auth.users, 
    // but here we might only access public profiles).
    // Note: 'profiles' table usually doesn't store email directly unless synced.
    // Let's check duplicate full_names as a heuristic if email isn't there.

    // FETCH ALL USERS via Admin API to get emails and true count
    const { data: { users }, error: authError } = await supabase.auth.admin.listUsers({
        page: 1,
        perPage: 1000
    });

    if (authError) {
        console.error('Error fetching auth users:', authError);
    } else {
        console.log(`\n🔐 Total Auth Users: ${users.length}`);

        // Analyze Auth Users
        const emailDomains = {};
        let missingProfileCount = 0;
        let duplicateEmails = 0;
        const seenEmails = new Set();
        const usersWithoutProfile = [];

        users.forEach(u => {
            if (seenEmails.has(u.email)) duplicateEmails++;
            seenEmails.add(u.email);

            const domain = u.email.split('@')[1];
            emailDomains[domain] = (emailDomains[domain] || 0) + 1;

            const hasProfile = profiles.find(p => p.id === u.id);
            if (!hasProfile) {
                missingProfileCount++;
                usersWithoutProfile.push(u.email);
            }
        });

        console.log(`\n📧 Email Domains Distribution:`);
        console.table(emailDomains);

        if (duplicateEmails > 0) {
            console.log(`\n⚠️ CRITICAL: Found ${duplicateEmails} duplicate emails in Auth System (Should be impossible).`);
        }

        if (missingProfileCount > 0) {
            console.log(`\n⚠️ ALERT: ${missingProfileCount} Auth Users found WITHOUT a Profile entry.`);
            console.log('Sample of users without profile:', usersWithoutProfile.slice(0, 10));
        }

        // Check if there are profiles without auth users (Orphaned profiles)
        const orphanedProfiles = profiles.filter(p => !users.find(u => u.id === p.id));
        if (orphanedProfiles.length > 0) {
            console.log(`\n⚠️ ALERT: ${orphanedProfiles.length} Profiles found WITHOUT an Auth User (Orphans).`);
        }
    }

    // 4. Analyze Students Table & Cross-Reference
    const { data: students, error: studentError } = await supabase
        .from('students')
        .select('id, roll_number, user_id');

    if (studentError) {
        console.error('Error fetching students:', studentError);
    } else {
        console.log(`\n👨‍🎓 Total Students in DB: ${students.length}`);

        // Find Ghost Users (Auth users not linked to any student and not staff)
        if (users) {
            const linkedUserIds = new Set(students.map(s => s.user_id).filter(Boolean));

            // Staff emails to exclude from "Ghost" detection
            const staffEmails = ['admin@elevates.com', 'coordinator@aaroh.com'];

            const ghostUsers = users.filter(u => {
                if (staffEmails.includes(u.email)) return false; // Is staff
                if (u.user_metadata?.role && u.user_metadata.role !== 'student') return false; // Is likely staff/coordinator
                if (linkedUserIds.has(u.id)) return false; // Is linked to a student
                return true; // Is GHOST
            });

            console.log(`\n👻 Ghost Users Detected: ${ghostUsers.length}`);
            console.log(`(Auth Users not linked to any Student record)`);

            if (ghostUsers.length > 0) {
                console.log('Sample Ghost Emails:', ghostUsers.slice(0, 5).map(u => u.email));
            }

            // Also check for "Unclaimed Students" (Students with no user_id)
            const unclaimedStudents = students.filter(s => !s.user_id);
            console.log(`\n⚠️ Unclaimed Students (No Auth User linked): ${unclaimedStudents.length}`);

            // INTELLIGENCE CHECK: Do the Ghosts match the Unclaimed Students?
            let reLinkableCount = 0;
            ghostUsers.forEach(u => {
                // Extract roll from noreply-ROLL@ekc.edu.in
                const match = u.email.match(/noreply-([a-zA-Z0-9]+)@/i);
                if (match) {
                    const roll = match[1].toUpperCase();
                    const student = unclaimedStudents.find(s => s.roll_number?.toUpperCase() === roll);
                    if (student) reLinkableCount++;
                }
            });

            console.log(`\n🔗 LINKABLE GHOSTS: ${reLinkableCount}`);

            // SHOW SAMPLE
            if (reLinkableCount > 0) {
                const sampleUser = ghostUsers.find(u => {
                    const match = u.email.match(/noreply-([a-zA-Z0-9]+)@/i);
                    if (match) {
                        const roll = match[1].toUpperCase();
                        return unclaimedStudents.find(s => s.roll_number?.toUpperCase() === roll);
                    }
                    return false;
                });

                if (sampleUser) {
                    const match = sampleUser.email.match(/noreply-([a-zA-Z0-9]+)@/i);
                    const roll = match[1].toUpperCase();
                    const student = unclaimedStudents.find(s => s.roll_number?.toUpperCase() === roll);

                    console.log('\n🔍 SAMPLE OF DISCONNECTED ACCOUNT:');
                    console.log(`Student ID (DB): ${student.id}`);
                    console.log(`Student Roll:    ${student.roll_number}`);
                    console.log(`Auth Email:      ${sampleUser.email}`);
                    console.log(`Auth User ID:    ${sampleUser.id}`);
                    console.log(`(This student exists in DB but is NOT linked to this existng Auth Account)`);
                }
            }

            console.log(`(These ${reLinkableCount} ghost accounts actually belong to unclaimed students but the link is broken. They are NOT random duplicates.)`);
            const trueGarbageCount = ghostUsers.length - reLinkableCount;
            console.log(`True Garbage Ghosts: ${trueGarbageCount}`);

            // SHOW SAMPLE OF TRUE GARBAGE
            if (trueGarbageCount > 0) {
                const garbageUser = ghostUsers.find(u => {
                    const match = u.email.match(/noreply-([a-zA-Z0-9]+)@/i);
                    if (match) {
                        const roll = match[1].toUpperCase();
                        // It is garbage if it DOES NOT match any unclaimed student
                        return !unclaimedStudents.find(s => s.roll_number?.toUpperCase() === roll);
                    }
                    // Or if it doesn't match the pattern at all, it's definitely garbage (unless it's a personal email test)
                    return true;
                });

                if (garbageUser) {
                    console.log('\n🗑️ SAMPLE OF GARBAGE ACCOUNT:');
                    console.log(`Auth Email:      ${garbageUser.email}`);
                    console.log(`Auth User ID:    ${garbageUser.id}`);
                    console.log(`Created At:      ${garbageUser.created_at}`);
                    console.log(`(This account has NO matching student record in the DB at all. It is safe to delete.)`);
                }
            }
        }
    }
}

analyzeUsers();
