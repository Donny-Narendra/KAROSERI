const fs = require('fs');
const { Client } = require('pg');
require('dotenv').config({path: '.env.local'});

async function run() {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error('Please provide a sql file path');
    process.exit(1);
  }
  const sql = fs.readFileSync(filePath, 'utf8');
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    await client.query(sql);
    console.log(`Success applying ${filePath}`);
  } catch (e) {
    console.error(e);
    process.exit(1);
  } finally {
    await client.end();
  }
}
run();
