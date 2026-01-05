
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing env vars');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDiscrepancies() {
    console.log('--- Checking 3rd Year Discrepancy ---');

    // 1. Get total registrations for 3rd year (Coordinator Logic)
    const { data: allRegs, error: e1 } = await supabase
        .from('registrations')
        .select(`id, status, student:students!inner(year)`)
        .eq('student.year', 'third');

    if (e1) console.error(e1);

    console.log(`Coordinator Dashboard (All Status): ${allRegs?.length}`);

    // Breakdown by status
    const statusCounts = {};
    allRegs.forEach(r => {
        statusCounts[r.status] = (statusCounts[r.status] || 0) + 1;
    });
    console.log('Breakdown:', statusCounts);

    // 2. Get registrations excluding rejected (Analytics Logic)
    const activeRegs = allRegs.filter(r => r.status !== 'rejected');
    console.log(`Event Analytics (Excluding Rejected): ${activeRegs.length}`);

    const rejectedCount = statusCounts['rejected'] || 0;
    console.log(`Rejected Count: ${rejectedCount}`);

    console.log('\n--- Checking 2nd Year (Suspicious Pending) ---');
    const { data: secondYearRegs } = await supabase
        .from('registrations')
        .select(`id, status, student:students!inner(year)`)
        .eq('student.year', 'second');

    console.log(`2nd Year Total: ${secondYearRegs?.length}`);
    const secondStatus = {};
    secondYearRegs.forEach(r => {
        secondStatus[r.status] = (secondStatus[r.status] || 0) + 1;
    });
    console.log('Breakdown:', secondStatus);
}

checkDiscrepancies();
