const { Client } = require('pg');

const client = new Client({
  connectionString: '***REDACTED***',
});

async function run() {
  await client.connect();
  const res = await client.query("SELECT id, deal_date, load_date, status, weight, rate FROM deals WHERE status = 'LOADED' ORDER BY id DESC LIMIT 5;");
  console.log(res.rows);
  await client.end();
}

run().catch(console.error);
