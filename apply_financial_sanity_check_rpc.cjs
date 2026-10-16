const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

async function applyMigration() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to PostgreSQL database.');

    const sqlPath = path.join(__dirname, 'supabase', 'migrations', '20261016_financial_sanity_check_rpc.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('Executing migration 20261016_financial_sanity_check_rpc.sql...');
    await client.query(sql);
    console.log('✅ Migration applied successfully!');

    console.log('\n--- Testing RPC: SELECT audit_financial_sanity_check(); ---');
    const res = await client.query('SELECT audit_financial_sanity_check() AS result;');
    console.log('RPC Output:', JSON.stringify(res.rows[0].result, null, 2));

    await client.end();
    console.log('\n✅ Task 1 Completed successfully!');
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  }
}

applyMigration();
