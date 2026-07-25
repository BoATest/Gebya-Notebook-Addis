const { Pool } = require('./node_modules/.pnpm/pg@8.20.0/node_modules/pg');

async function main() {
  const p = new Pool({
    connectionString: 'postgresql://postgres.ftsdldrzmjpkvxtwwgmc:2024@_boaTEST@aws-1-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true',
    ssl: { rejectUnauthorized: false }
  });
  
  const tables = ['business_members', 'businesses', 'users', 'otps', 'transactions', 'customer_transactions'];
  
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
