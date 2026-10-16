const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function runEmpiricalValidation() {
  const client = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await client.connect();

  console.log('🧪 Starting Empirical Validation: Itemized Change Orders & Point-in-Time Price Snapshot...\n');

  try {
    // 1. Verify schema columns on change_orders and change_order_items
    console.log('--- Stage 1: Database Schema & Column Verification ---');
    const colsRes = await client.query(`
      SELECT table_name, column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name IN ('change_orders', 'change_order_items')
      ORDER BY table_name, ordinal_position;
    `);

    const coCols = colsRes.rows.filter(r => r.table_name === 'change_orders').map(r => r.column_name);
    const itemCols = colsRes.rows.filter(r => r.table_name === 'change_order_items').map(r => r.column_name);

    console.log('change_orders columns:', coCols.join(', '));
    console.log('change_order_items columns:', itemCols.join(', '));

    const requiredCoCols = ['id', 'spk_id', 'co_number', 'status', 'approved_at', 'approved_by', 'cost_adjustment', 'total_amount'];
    const requiredItemCols = ['id', 'change_order_id', 'spk_id', 'wbs_stage', 'item_type', 'material_id', 'item_name', 'quantity', 'unit', 'unit_price', 'cost_price', 'subtotal'];

    for (const col of requiredCoCols) {
      if (!coCols.includes(col)) throw new Error(`Missing column in change_orders: ${col}`);
    }
    for (const col of requiredItemCols) {
      if (!itemCols.includes(col)) throw new Error(`Missing column in change_order_items: ${col}`);
    }
    console.log('✅ Stage 1 PASS: All required header and detail columns are present.\n');

    // 2. Create test master material
    console.log('--- Stage 2: Create Master Material & Initial Snapshot Setup ---');
    const matRes = await client.query(`
      INSERT INTO materials (name, unit, unit_price, cost_price, selling_price, current_stock, minimum_stock)
      VALUES ('Plat Baja CO Test 4mm', 'Lbr', 200000, 140000, 200000, 40, 5)
      RETURNING id, name, unit_price, cost_price, selling_price;
    `);
    const testMat = matRes.rows[0];
    console.log('Master material created:', {
      id: testMat.id,
      name: testMat.name,
      selling_price: testMat.selling_price,
      cost_price: testMat.cost_price
    });

    // 3. Create test SPK
    const spkNo = `SPK-CO-TEST-${Date.now().toString().slice(-4)}`;
    const spkRes = await client.query(`
      INSERT INTO spk (spk_no, customer_name, vehicle_plate, status, created_by)
      VALUES ($1, 'PT Karoseri Uji CO', 'B 7777 CO', 'ACTIVE', '559543a3-da07-4d64-81f6-36c1f08ad9fc')
      RETURNING id, spk_no, status;
    `, [spkNo]);
    const testSpk = spkRes.rows[0];
    console.log('Test SPK created:', testSpk);

    // 4. Create Change Order Header and Itemized Detail
    console.log('\n--- Stage 3: Insert Itemized Change Order with Price Snapshot & WBS Allocation ---');
    const coNumber = `CO-${spkNo}-001`;
    const coRes = await client.query(`
      INSERT INTO change_orders (spk_id, co_number, description, cost_adjustment, total_amount, status)
      VALUES ($1, $2, 'Uji Amandemen Tambah Plat Sasis', 600000, 600000, 'PENDING')
      RETURNING id, spk_id, co_number, status, cost_adjustment, total_amount;
    `, [testSpk.id, coNumber]);
    const testCo = coRes.rows[0];
    console.log('Change Order header created:', testCo);

    // Insert 2 items: 1 Material (with snapshot from master), 1 Labor
    const item1Res = await client.query(`
      INSERT INTO change_order_items (
        change_order_id, spk_id, wbs_stage, item_type, material_id, 
        item_name, quantity, unit, unit_price, cost_price, notes
      )
      VALUES ($1, $2, 'WBS 2: Sasis/Rangka', 'MATERIAL', $3, $4, 2, 'Lbr', $5, $6, 'Plat penguat rangka')
      RETURNING id, wbs_stage, item_type, quantity, unit_price, cost_price, subtotal;
    `, [testCo.id, testSpk.id, testMat.id, testMat.name, testMat.selling_price, testMat.cost_price]);
    const testItem1 = item1Res.rows[0];

    const item2Res = await client.query(`
      INSERT INTO change_order_items (
        change_order_id, spk_id, wbs_stage, item_type, material_id, 
        item_name, quantity, unit, unit_price, cost_price, notes
      )
      VALUES ($1, $2, 'WBS 2: Sasis/Rangka', 'LABOR', NULL, 'Jasa Las Penguat Sasis', 4, 'jam', 50000, 30000, 'Upah tukang las borongan')
      RETURNING id, wbs_stage, item_type, quantity, unit_price, cost_price, subtotal;
    `, [testCo.id, testSpk.id]);
    const testItem2 = item2Res.rows[0];

    console.log('Item 1 (Material):', testItem1);
    console.log('Item 2 (Labor):', testItem2);

    // Verify generated subtotal
    if (Number(testItem1.subtotal) !== 400000) {
      throw new Error(`Item 1 subtotal mismatch: expected 400000, got ${testItem1.subtotal}`);
    }
    if (Number(testItem2.subtotal) !== 200000) {
      throw new Error(`Item 2 subtotal mismatch: expected 200000, got ${testItem2.subtotal}`);
    }
    console.log('✅ Stage 3 PASS: Subtotals automatically generated and stored correctly.\n');

    // 5. Test Price Immutability: Inflate Master Warehouse Price
    console.log('--- Stage 4: Testing Point-in-Time Immutability against Master Price Inflation ---');
    console.log('Inflating master material price to Rp 999.999 (selling) and Rp 888.888 (cost)...');
    await client.query(`
      UPDATE materials 
      SET selling_price = 999999, cost_price = 888888, unit_price = 999999
      WHERE id = $1;
    `, [testMat.id]);

    // Re-query change_order_items
    const verifyItemRes = await client.query(`
      SELECT id, item_name, unit_price, cost_price, subtotal 
      FROM change_order_items 
      WHERE id = $1;
    `, [testItem1.id]);
    const verifiedItem = verifyItemRes.rows[0];

    console.log('Verified Change Order Item after Master Inflation:', verifiedItem);
    if (Number(verifiedItem.unit_price) !== 200000) {
      throw new Error(`Price immutability violated! unit_price changed to ${verifiedItem.unit_price}`);
    }
    if (Number(verifiedItem.cost_price) !== 140000) {
      throw new Error(`Price immutability violated! cost_price changed to ${verifiedItem.cost_price}`);
    }
    if (Number(verifiedItem.subtotal) !== 400000) {
      throw new Error(`Subtotal changed! expected 400000, got ${verifiedItem.subtotal}`);
    }
    console.log('✅ Stage 4 PASS: Point-in-Time Price Snapshot remains 100% immutable.\n');

    // 6. Test Legacy Synchronization with spk_amendments
    console.log('--- Stage 5: Testing Legacy spk_amendments Trigger Synchronization ---');
    const legacyRes = await client.query(`
      SELECT id, spk_id, description, cost_adjustment, status 
      FROM spk_amendments 
      WHERE id = $1;
    `, [testCo.id]);
    console.log('Synchronized spk_amendments row:', legacyRes.rows[0]);
    if (!legacyRes.rows[0] || legacyRes.rows[0].status !== 'PENDING') {
      throw new Error('Trigger synchronization with spk_amendments failed!');
    }
    console.log('✅ Stage 5 PASS: Legacy spk_amendments synchronized automatically.\n');

    // 7. Test Approval Lifecycle
    console.log('--- Stage 6: Testing Approval Workflow & Audit Trail ---');
    await client.query(`
      UPDATE change_orders 
      SET status = 'APPROVED', approved_at = NOW(), approved_by = '559543a3-da07-4d64-81f6-36c1f08ad9fc'
      WHERE id = $1;
    `, [testCo.id]);

    const approvedCoRes = await client.query(`
      SELECT id, status, approved_at, approved_by 
      FROM change_orders 
      WHERE id = $1;
    `, [testCo.id]);
    console.log('Approved Change Order:', approvedCoRes.rows[0]);

    const approvedLegacyRes = await client.query(`
      SELECT id, status 
      FROM spk_amendments 
      WHERE id = $1;
    `, [testCo.id]);
    console.log('Approved Legacy Row:', approvedLegacyRes.rows[0]);

    if (approvedCoRes.rows[0].status !== 'APPROVED' || approvedLegacyRes.rows[0].status !== 'APPROVED') {
      throw new Error('Approval propagation failed!');
    }
    console.log('✅ Stage 6 PASS: Approval lifecycle and sync verified.\n');

    // Clean up test data
    console.log('--- Cleaning Up Test Artifacts ---');
    await client.query('DELETE FROM change_orders WHERE id = $1;', [testCo.id]);
    await client.query('DELETE FROM spk WHERE id = $1;', [testSpk.id]);
    await client.query('DELETE FROM materials WHERE id = $1;', [testMat.id]);
    console.log('✅ Clean up complete.\n');

    console.log('🎉 ALL 6 EMPIRICAL VALIDATION STAGES PASSED WITH 100% SUCCESS!');
  } finally {
    await client.end();
  }
}

runEmpiricalValidation().catch(err => {
  console.error('❌ Validation failed with error:', err);
  process.exit(1);
});
