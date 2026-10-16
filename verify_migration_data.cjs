const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function check() {
  const client = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await client.connect();

  console.log('=== VERIFY MATERIALS ===');
  const matRes = await client.query(`
    SELECT id, name, unit_price, cost_price, selling_price 
    FROM materials 
    LIMIT 5;
  `);
  console.table(matRes.rows);

  console.log('=== VERIFY RAB_ITEMS ===');
  const rabRes = await client.query(`
    SELECT id, spk_id, material_name, quantity, unit_price, cost_price, subtotal, is_locked 
    FROM rab_items 
    LIMIT 5;
  `);
  console.table(rabRes.rows);

  console.log('=== VERIFY SPK LOCKING ===');
  const spkRes = await client.query(`
    SELECT id, spk_no, status, is_pricing_locked, locked_at 
    FROM spk 
    ORDER BY created_at DESC 
    LIMIT 5;
  `);
  console.table(spkRes.rows);

  console.log('=== VERIFY MATERIAL_REQUISITION_ITEMS ===');
  const reqRes = await client.query(`
    SELECT id, material_name, quantity, unit_price, cost_price, subtotal 
    FROM material_requisition_items 
    LIMIT 5;
  `);
  console.table(reqRes.rows);

  await client.end();
}

check().catch(console.error);
