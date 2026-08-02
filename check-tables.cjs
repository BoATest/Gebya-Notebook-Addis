const { Pool } = require('./node_modules/.pnpm/pg@8.22.0/node_modules/pg');

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL is not set');
    process.exit(1);
  }

  const p = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  const tables = ['business_members', 'businesses', 'users', 'otps', 'transactions', 'customer_transactions', 'suppliers', 'staff_members', 'notifications', 'invites', 'settlements'];

  for (const table of tables) {
    try {
      const r = await p.query(
        `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = $1 ORDER BY ordinal_position`,
        [table]
      );
      console.log(`\n--- ${table} (${r.rows.length} columns) ---`);
      r.rows.forEach(row => console.log(`  ${row.column_name}: ${row.data_type}`));
    } catch (e) {
      console.log(`\n--- ${table}: ERROR: ${e.message} ---`);
    }
  }

  await p.end();
}

main().catch(console.error);
