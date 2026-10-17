const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function verifyLaborViewFix() {
  const client = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await client.connect();

  console.log('==============================================================================');
  console.log('🧪 EMPIRICAL VALIDATION: FIX VIEW_WBS_COST_VARIANCE LABOR AGGREGATION');
  console.log('==============================================================================\n');

  try {
    // 1. Check View Definition
    console.log('--- Step 1: Verify View SQL Definition in PostgreSQL ---');
    const defRes = await client.query(`
      SELECT definition 
      FROM pg_views 
      WHERE schemaname = 'public' AND viewname = 'view_wbs_cost_variance';
    `);
    if (defRes.rows.length === 0) {
      throw new Error('view_wbs_cost_variance not found in pg_views!');
    }
    const def = defRes.rows[0].definition;
    const hasMaterialNull = def.includes('MATERIAL') && (def.includes('IS NULL') || def.includes('is null'));
    const hasLabor = def.includes('LABOR');
    
    if (!hasMaterialNull) {
      throw new Error('View definition missing MATERIAL OR NULL condition!');
    }
    if (!hasLabor) {
      throw new Error('View definition missing LABOR condition!');
    }
    console.log('  ✓ View definition correctly includes MATERIAL OR NULL and LABOR branch handling.');

    // 2. Query Live Data
    console.log('\n--- Step 2: Query Live Data from view_wbs_cost_variance ---');
    const dataRes = await client.query(`
      SELECT 
        spk_number,
        customer_name,
        wbs_stage,
        total_material_budget,
        actual_material_spent,
        material_variance,
        total_labor_budget,
        actual_labor_spent,
        labor_variance
      FROM view_wbs_cost_variance
      ORDER BY spk_number, wbs_stage;
    `);

    console.log(`  ✓ Successfully retrieved ${dataRes.rows.length} rows.`);

    let nonZeroLaborCount = 0;
    for (const row of dataRes.rows) {
      const matBudget = Number(row.total_material_budget);
      const matSpent = Number(row.actual_material_spent);
      const matVar = Number(row.material_variance);

      const labBudget = Number(row.total_labor_budget);
      const labSpent = Number(row.actual_labor_spent);
      const labVar = Number(row.labor_variance);

      if (labBudget > 0) {
        nonZeroLaborCount++;
      }

      // Check math precision
      if (Math.abs(matVar - (matBudget - matSpent)) > 0.001) {
        throw new Error(`Material variance math mismatch on ${row.spk_number} ${row.wbs_stage}: ${matVar} vs ${matBudget - matSpent}`);
      }
      if (Math.abs(labVar - (labBudget - labSpent)) > 0.001) {
        throw new Error(`Labor variance math mismatch on ${row.spk_number} ${row.wbs_stage}: ${labVar} vs ${labBudget - labSpent}`);
      }
    }

    console.log(`  ✓ Verified variance formulas for all ${dataRes.rows.length} rows.`);
    console.log(`  ✓ Found ${nonZeroLaborCount} WBS stages with active Total Labor Budget (> Rp 0).`);

    if (nonZeroLaborCount === 0) {
      throw new Error('Expected at least one WBS stage with total_labor_budget > 0, but found none!');
    }

    // 3. Check Grant Permissions
    console.log('\n--- Step 3: Verify Grant Permissions on view_wbs_cost_variance ---');
    const grantRes = await client.query(`
      SELECT grantee, privilege_type 
      FROM information_schema.role_table_grants 
      WHERE table_name = 'view_wbs_cost_variance' AND grantee = 'authenticated';
    `);
    const privileges = grantRes.rows.map(r => r.privilege_type);
    if (!privileges.includes('SELECT')) {
      throw new Error('Role "authenticated" is missing SELECT privilege on view_wbs_cost_variance!');
    }
    console.log('  ✓ Role "authenticated" has SELECT privilege on view_wbs_cost_variance.');

    console.log('\n==============================================================================');
    console.log('🏆 EMPIRICAL VALIDATION COMPLETE: VIEW_WBS_COST_VARIANCE IS 100% OPERATIONAL!');
    console.log('==============================================================================');
  } finally {
    await client.end();
  }
}

verifyLaborViewFix().catch(err => {
  console.error('❌ Validation failed:', err);
  process.exit(1);
});
