
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);

async function check() {
    const { data, error } = await supabase.from('students').select('department');
    if (error) console.error(error);
    else {
        const depts = [...new Set(data.map(d => d.department))];
        console.log('Valid Departments:', depts);
    }
}
check();
