require('dotenv').config({path: '.env.local'});
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function run() {
  const { data, error } = await supabase.from('spk').select(`
      *,
      qc_inspections ( status, inspected_at ),
      invoices ( status, created_at ),
      rab_estimations ( id, total_labor_cost, total_overhead_cost, total_estimated_cost, rab_items ( item_total, package_id, product_packages ( id, selling_price ) ) ),
      inventory_transactions ( quantity_issued, custom_unit_price, materials ( unit_price, is_customer_supplied ) ),
      spk_amendments ( status, cost_adjustment )
    `).eq('spk_no', 'SPK-5902');
  console.log(JSON.stringify(data, null, 2));
}
run();
