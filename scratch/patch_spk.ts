import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function patch() {
  console.log('Fetching SPK-5902 with rab_estimations and rab_items...');
  const { data: spk, error: spkError } = await supabase
    .from('spk')
    .select(`
      id, spk_no, 
      rab_estimations ( id, rab_items ( id, item_total, package_id, product_packages ( id, name, selling_price ) ) )
    `)
    .eq('spk_no', 'SPK-5902')
    .single();

  if (spkError || !spk) {
    console.error('Error or not found:', spkError);
    return;
  }
  
  console.log(JSON.stringify(spk, null, 2));
}

patch();
