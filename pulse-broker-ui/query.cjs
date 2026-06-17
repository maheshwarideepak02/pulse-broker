const { Client } = require('pg');

const client = new Client({
  connectionString: '***REDACTED***',
});

async function run() {
  await client.connect();
  const res = await client.query("ALTER TABLE deals ALTER COLUMN load_date TYPE VARCHAR(255) USING load_date::VARCHAR;");
  console.log('Migration successful');
  await client.end();
}

run().catch(console.error);
