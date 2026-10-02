const { Client } = require('pg');
const client = new Client({ 
  connectionString: 'postgresql://postgres:Robelkaro5er!@db.ixlgwgbfnyvhqlaqxmgr.supabase.co:5432/postgres',
  host: 'db.ixlgwgbfnyvhqlaqxmgr.supabase.co',
  port: 5432,
});
// Workaround for IPv6 resolution in Node if needed, or just let pg handle it
(async () => {
  try {
    await client.connect();
    const res = await client.query("SELECT column_name, data_type, udt_name FROM information_schema.columns WHERE table_schema = 'auth' AND table_name = 'users';");
    console.log(res.rows);
    await client.end();
  } catch(e) {
    console.error(e);
  }
})();
