const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://postgres:Robelkaro5er!@db.ixlgwgbfnyvhqlaqxmgr.supabase.co:5432/postgres' });
(async () => {
  await client.connect();
  const res = await client.query(`SELECT trigger_name, event_manipulation, action_statement FROM information_schema.triggers WHERE event_object_table = 'users' AND event_object_schema = 'auth';`);
  console.log(res.rows);
  await client.end();
})();
