const { Client } = require('pg');
require('dotenv').config({path: '.env.local'});
const client = new Client({ connectionString: process.env.DATABASE_URL });
async function run() {
  await client.connect();
  const sql = `
  DO $$ BEGIN
    CREATE POLICY "Kasir can read rab_items" ON public.rab_items FOR SELECT USING ( (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'kasir' );
  EXCEPTION WHEN duplicate_object THEN NULL; END $$;

  DO $$ BEGIN
    CREATE POLICY "Kasir can read spk_amendments" ON public.spk_amendments FOR SELECT USING ( (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'kasir' );
  EXCEPTION WHEN duplicate_object THEN NULL; END $$;
  `;
  await client.query(sql);
  console.log('Success');
  await client.end();
}
run().catch(console.error);
