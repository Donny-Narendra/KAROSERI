const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://postgres:Robelkaro5er!@db.ixlgwgbfnyvhqlaqxmgr.supabase.co:5432/postgres' });
(async () => {
  await client.connect();
  const res = await client.query(`SELECT routine_name, routine_definition FROM information_schema.routines WHERE routine_schema = 'public';`);
  console.log(JSON.stringify(res.rows, null, 2));
  await client.end();
})();
