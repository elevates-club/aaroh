
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

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

// Department Mapping (Normalize to DB Enum)
const DEPT_MAP = {
    'AIDS': 'AIDS',
    'AI&DS': 'AIDS',
    'CSE': 'CSE',
    'COMPUTER SCIENCE': 'CSE',
    'ECE': 'ECE',
    'ELECTRONICS': 'ECE',
    'CE': 'CE',
    'CIVIL': 'CE',
    'ME': 'MEC',
    'MEC': 'MEC',
    'MECHANICAL': 'MEC',
    'CSBS': 'CSBS',
    'CSCS': 'CSCS',
    'SFE': 'SFE'
};

async function processRow(row) {
    // Expected CSV Format: name,roll_number,department(unused),year,Department(used)
    // Indexes: 0=name, 1=roll_number, 2=x, 3=year, 4=Department

    // Safety check
    if (!row || row.length < 5) return;

    const name = row[0]?.trim();
    const rollNumber = row[1]?.trim().toUpperCase();
    const rawYear = row[3]?.trim().toLowerCase();
    const rawDept = row[4]?.trim().toUpperCase();

    if (!rollNumber || !name) return;

    // Normalize Dept
    let dept = DEPT_MAP[rawDept] || rawDept; // Fallback to raw if not in map
    // Hack: If empty, try checking if it's in DB valid list? For now trust map.

    console.log(`Processing: ${rollNumber} - ${name} (${dept})`);

    // 1. Create/Update Student Record
    const stdData = {
        name: name,
        roll_number: rollNumber,
        department: dept,
        year: 'first', // Enforce first year as per prompt
    };

    const { data: student, error: stdError } = await supabase
        .from('students')
        .upsert(stdData, { onConflict: 'roll_number' })
        .select()
        .single();

    if (stdError) {
        console.error(`   ❌ Student Insert Failed: ${stdError.message}`);
        return;
    }

    console.log(`   ✅ Student Record Saved (ID: ${student.id})`);

    // 2. Create Auth User
    const email = `noreply-${rollNumber}@ekc.edu.in`;
    const password = rollNumber.toLowerCase();

    // Check if user exists (by email) -> We can't list all easily if many, but we can try to create
    // createUser automatically fails if exists.

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: email,
        password: password,
        email_confirm: true,
        user_metadata: {
            roll_number: rollNumber,
            name: name,
            full_name: name,
            is_student: true,
            role: 'student'
        }
    });

    let userId = authData.user?.id;

    if (authError) {
        if (authError.message.includes('already been registered')) {
            console.log('   ⚠️ Auth User exists. Fetching ID...');
            // Need to fetch user ID to link. 
            // In a real bulk script, we might cache users list, but for 200 it's ok to list or fail.
            // Admin listUsers? 
            // Let's rely on update?
            // "Updated password..."
            const { data: { users } } = await supabase.auth.admin.listUsers();
            const existing = users.find(u => u.email.toLowerCase() === email.toLowerCase());
            if (existing) userId = existing.id;
        } else {
            console.error(`   ❌ Auth Create Failed: ${authError.message}`);
            return;
        }
    } else {
        console.log(`   ✅ Auth User Created`);
    }

    // 3. Link Student -> User with Profile
    if (userId) {
        // Link in students table
        const { error: linkError } = await supabase
            .from('students')
            .update({ user_id: userId })
            .eq('id', student.id);

        if (linkError) console.error(`   ❌ Link Failed: ${linkError.message}`);
        else console.log(`   ✅ Linked to Auth User`);

        // Ensure Profile exists (Create User usually triggers this if trigger is set up?
        // But our trigger depends on metadata role. We passed 'student'.
        // Let's assume trigger handles profile creation. Or we can manually upsert profile.)
        // Manual profile update to be safe:
        /*
        await supabase.from('profiles').upsert({
            id: userId,
            user_id: userId,
            email: email, // system email
            full_name: name,
            role: 'student',
            is_first_login: true
        });
        */
    }
}

async function run() {
    const csvPath = path.resolve(__dirname, '../first-year-students.csv');
    if (!fs.existsSync(csvPath)) {
        console.error('CSV file not found:', csvPath);
        process.exit(1);
    }

    const content = fs.readFileSync(csvPath, 'utf-8');
    const rows = content.split('\n').map(line => line.split(',')); // Simple split, assumes no commas in fields

    // Skip Header? 
    // Header: name,roll_number...
    // Check first row
    let startIdx = 0;
    if (rows[0][0].toLowerCase() === 'name') startIdx = 1;

    console.log(`Found ${rows.length - startIdx} rows.`);

    for (let i = startIdx; i < rows.length; i++) {
        await processRow(rows[i]);
    }

    console.log('\n✨ Import Complete!');
}

run();
