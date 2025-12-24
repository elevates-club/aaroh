
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function seed() {
    console.log('🌱 Seeding Test Data...');

    // 1. Create or Get Test Event
    const eventName = 'Agent Verification Singing';
    let { data: event, error: fetchError } = await supabase
        .from('events')
        .select('*')
        .eq('name', eventName)
        .single();

    // If not found (error code PGRST116 means 0 rows), create it
    if (!event) {
        console.log('   Creating new event...');
        const { data: newEvent, error: createError } = await supabase
            .from('events')
            .insert({
                name: eventName,
                category: 'on_stage',
                mode: 'individual',
                registration_method: 'student',
                description: 'Test event for verification agent.',
                venue: 'Main Hall',
                event_date: new Date().toISOString(),
                is_active: true
            })
            .select()
            .single();

        if (createError) {
            console.error('❌ Event Create Failed:', createError);
            return;
        }
        event = newEvent;
    }
    console.log(`✅ Event Ready: ${event.name} (${event.id})`);

    // 2. Get a Student (Use any existing one)
    const { data: students, error: studentError } = await supabase
        .from('students')
        .select('*')
        .limit(1);

    if (studentError || !students || students.length === 0) {
        console.error('❌ No students found to register.');
        return;
    }
    const student = students[0];
    console.log(`✅ Student Found: ${student.name} (${student.id})`);

    // 3. Register Student (Approved)
    // Check if exists first
    const { data: existingReg } = await supabase
        .from('registrations')
        .select('*')
        .eq('event_id', event.id)
        .eq('student_id', student.id)
        .single();

    if (!existingReg) {
        const { error: regError } = await supabase
            .from('registrations')
            .insert({
                event_id: event.id,
                student_id: student.id,
                status: 'approved',
                registered_by: student.user_id
            });

        if (regError) {
            console.log('❌ Registration Failed:', regError.message);
        } else {
            console.log(`✅ Registration Created (Approved)`);
        }
    } else {
        console.log('✅ Registration already exists.');
    }

    console.log('🎉 Seeding Complete. Ready for Browser Agent.');
}

seed();
