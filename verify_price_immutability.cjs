const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function runEmpiricalValidation() {
  const client = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await client.connect();

  console.log('🧪 Starting Empirical Validation: Immutable Point-in-Time Price Snapshot & Document Locking...\n');

  try {
    // 1. Create a temporary test material
    const matRes = await client.query(`
      INSERT INTO materials (name, unit, unit_price, cost_price, selling_price, current_stock, minimum_stock)
      VALUES ('Plat Bordes Test 3mm', 'Lbr', 150000, 110000, 150000, 50, 10)
      RETURNING id, name, unit_price, cost_price, selling_price;
    `);
    const testMaterial = matRes.rows[0];
    console.log('✅ 1. Test Master Material created:', {
      id: testMaterial.id,
      name: testMaterial.name,
      cost_price: testMaterial.cost_price,
      selling_price: testMaterial.selling_price,
      unit_price: testMaterial.unit_price
    });

    // 2. Create a temporary DRAFT SPK
    const spkNo = `SPK-TEST-${Date.now()}`;
    const spkRes = await client.query(`
      INSERT INTO spk (spk_no, customer_name, vehicle_plate, status, is_pricing_locked, created_by)
      VALUES ($1, 'PT Test Immutability', 'B 9999 TEST', 'DRAFT', FALSE, '559543a3-da07-4d64-81f6-36c1f08ad9fc')
      RETURNING id, spk_no, status, is_pricing_locked, locked_at;
    `, [spkNo]);
    const testSpk = spkRes.rows[0];
    console.log('✅ 2. Test DRAFT SPK created:', {
      id: testSpk.id,
      spk_no: testSpk.spk_no,
      status: testSpk.status,
      is_pricing_locked: testSpk.is_pricing_locked
    });

    // 3. Create RAB estimation & snapshot rab_items
    const rabEstRes = await client.query(`
      INSERT INTO rab_estimations (spk_id, total_material_cost, total_labor_cost, total_overhead_cost, total_estimated_cost)
      VALUES ($1, 1500000, 0, 0, 1500000)
      RETURNING id;
    `, [testSpk.id]);
    const testRabEstId = rabEstRes.rows[0].id;

    // Notice we do NOT supply 'subtotal' since it is GENERATED ALWAYS AS (quantity * unit_price) STORED
    const rabItemRes = await client.query(`
      INSERT INTO rab_items (rab_estimation_id, spk_id, material_id, material_name, wbs_category, quantity, unit_price, cost_price, is_locked)
      VALUES ($1, $2, $3, $4, 'Dinding/Fabrikasi', 10, 150000, 110000, FALSE)
      RETURNING id, material_name, quantity, unit_price, cost_price, subtotal, is_locked;
    `, [testRabEstId, testSpk.id, testMaterial.id, testMaterial.name]);
    const testRabItem = rabItemRes.rows[0];
    console.log('✅ 3. Test rab_items inserted with Point-in-Time Snapshot:', {
      id: testRabItem.id,
      material_name: testRabItem.material_name,
      quantity: testRabItem.quantity,
      unit_price: testRabItem.unit_price,
      cost_price: testRabItem.cost_price,
      subtotal: testRabItem.subtotal,
      is_locked: testRabItem.is_locked
    });

    if (parseFloat(testRabItem.subtotal) !== 1500000) {
      throw new Error(`Subtotal mismatch! Expected 1500000, got ${testRabItem.subtotal}`);
    }

    // 4. Create Material Requisition & requisition items with snapshot
    const reqRes = await client.query(`
      INSERT INTO material_requisitions (spk_id, wbs_category, requested_by, status, notes)
      VALUES ($1, 'Dinding/Fabrikasi', '559543a3-da07-4d64-81f6-36c1f08ad9fc', 'PENDING', 'Pengajuan Material Test')
      RETURNING id;
    `, [testSpk.id]);
    const testReqId = reqRes.rows[0].id;

    const reqItemRes = await client.query(`
      INSERT INTO material_requisition_items (requisition_id, material_id, material_name, quantity, unit, unit_price, cost_price, subtotal)
      VALUES ($1, $2, $3, 10, 'Lbr', 150000, 110000, 1500000)
      RETURNING id, material_name, quantity, unit_price, cost_price, subtotal;
    `, [testReqId, testMaterial.id, testMaterial.name]);
    const testReqItem = reqItemRes.rows[0];
    console.log('✅ 4. Test requisition item inserted with Point-in-Time Snapshot:', {
      id: testReqItem.id,
      unit_price: testReqItem.unit_price,
      cost_price: testReqItem.cost_price,
      subtotal: testReqItem.subtotal
    });

    // 5. Test Price Immutability: Mutate Master Inventory prices drastically
    console.log('\n--- Simulating Raw Material Price Inflation in Master Warehouse ---');
    await client.query(`
      UPDATE materials 
      SET unit_price = 300000, cost_price = 220000, selling_price = 300000 
      WHERE id = $1;
    `, [testMaterial.id]);
    console.log('⚡ Master material prices updated: unit_price = 300,000, cost_price = 220,000');

    // Verify snapshot values in rab_items and requisition_items remain unaffected
    const checkRabItem = await client.query(`SELECT unit_price, cost_price, subtotal, is_locked FROM rab_items WHERE id = $1;`, [testRabItem.id]);
    const checkReqItem = await client.query(`SELECT unit_price, cost_price, subtotal FROM material_requisition_items WHERE id = $1;`, [testReqItem.id]);

    console.log('🔍 Checking transaction items after master price increase:');
    console.log('   rab_items -> unit_price:', checkRabItem.rows[0].unit_price, 'subtotal:', checkRabItem.rows[0].subtotal);
    console.log('   material_requisition_items -> unit_price:', checkReqItem.rows[0].unit_price, 'subtotal:', checkReqItem.rows[0].subtotal);

    if (parseFloat(checkRabItem.rows[0].unit_price) !== 150000 || parseFloat(checkRabItem.rows[0].subtotal) !== 1500000) {
      throw new Error('IMMUTABILITY VIOLATION: rab_items price altered when master material price changed!');
    }
    if (parseFloat(checkReqItem.rows[0].unit_price) !== 150000 || parseFloat(checkReqItem.rows[0].subtotal) !== 1500000) {
      throw new Error('IMMUTABILITY VIOLATION: requisition_items price altered when master material price changed!');
    }
    console.log('🎉 [PASS] IMMUTABILITY CONFIRMED: Historic transaction prices are completely decoupled from master inventory!');

    // 6. Test Document Locking Trigger: Transition SPK to ACTIVE
    console.log('\n--- Simulating SPK Approval: Transitioning SPK from DRAFT to ACTIVE ---');
    await client.query(`
      UPDATE spk 
      SET status = 'ACTIVE' 
      WHERE id = $1;
    `, [testSpk.id]);

    const updatedSpk = await client.query(`SELECT id, status, is_pricing_locked, locked_at FROM spk WHERE id = $1;`, [testSpk.id]);
    console.log('🔍 SPK record after transition:', updatedSpk.rows[0]);

    if (!updatedSpk.rows[0].is_pricing_locked || !updatedSpk.rows[0].locked_at) {
      throw new Error('TRIGGER FAILURE: spk.is_pricing_locked was not automatically set to TRUE on ACTIVE transition!');
    }

    const lockedRabItem = await client.query(`SELECT id, is_locked FROM rab_items WHERE id = $1;`, [testRabItem.id]);
    console.log('🔍 rab_items record after transition:', lockedRabItem.rows[0]);

    if (!lockedRabItem.rows[0].is_locked) {
      throw new Error('TRIGGER FAILURE: rab_items.is_locked was not automatically set to TRUE on SPK ACTIVE transition!');
    }
    console.log('🎉 [PASS] DOCUMENT LOCKING TRIGGER CONFIRMED: SPK and all associated RAB items are strictly locked read-only!');

    // 7. Cleanup test data
    console.log('\n--- Cleaning up temporary test records ---');
    await client.query(`DELETE FROM material_requisition_items WHERE requisition_id = $1;`, [testReqId]);
    await client.query(`DELETE FROM material_requisitions WHERE id = $1;`, [testReqId]);
    await client.query(`DELETE FROM rab_items WHERE id = $1;`, [testRabItem.id]);
    await client.query(`DELETE FROM rab_estimations WHERE id = $1;`, [testRabEstId]);
    await client.query(`DELETE FROM spk WHERE id = $1;`, [testSpk.id]);
    await client.query(`DELETE FROM materials WHERE id = $1;`, [testMaterial.id]);
    console.log('✅ Temporary test data cleaned up successfully.');

    console.log('\n======================================================');
    console.log('🏆 ALL EMPIRICAL VALIDATION TESTS PASSED WITH 100% SUCCESS');
    console.log('======================================================\n');
  } catch (err) {
    console.error('❌ Validation Failed:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runEmpiricalValidation();
