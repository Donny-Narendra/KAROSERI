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
  console.log('Fetching SPKs...');
  const { data: spks, error: spkError } = await supabase.from('spk').select('id, spk_no').limit(10);
  if (spkError || !spks) {
    console.error('SPK error:', spkError);
    return;
  }
  console.log(spks);
  
  const spk = spks.find(s => s.spk_no === 'SPK-5902' || s.spk_no.includes('5902'));
  if (!spk) return;
  
  console.log('SPK ID:', spk.id);
  const { data: est, error: estError } = await supabase.from('rab_estimations').select('id').eq('spk_id', spk.id).single();
  if (estError || !est) {
    console.error('Est error:', estError);
    return;
  }
  
  console.log('Estimation ID:', est.id);
  
  const packageId = 'a32ab8ed-c7d1-4212-808f-46359e368735';
  
  const { data: items, error: itemsError } = await supabase.from('rab_items').select('*').eq('rab_estimation_id', est.id);
  if (itemsError) {
    console.error('Items error:', itemsError);
    return;
  }
  
  console.log(`Found ${items.length} items`);
  
  const { error: updateError } = await supabase.from('rab_items').update({ package_id: packageId }).eq('rab_estimation_id', est.id);
  if (updateError) {
    console.error('Update error:', updateError);
    return;
  }
  
  console.log('Successfully patched package_id');
}

patch();
