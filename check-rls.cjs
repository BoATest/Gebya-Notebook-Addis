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

  // Check RLS status
  const r1 = await p.query(
    "SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename IN ('business_members', 'users', 'otps')"
  );
  console.log('RLS status:', JSON.stringify(r1.rows, null, 2));

  // Try querying business_members directly
  try {
    const r2 = await p.query('SELECT id FROM business_members LIMIT 1');
    console.log('business_members query OK:', r2.rows.length, 'rows');
  } catch(e) {
    console.log('business_members query ERROR:', e.message);
  }

  // Try querying users directly
  try {
    const r3 = await p.query('SELECT id FROM users LIMIT 1');
    console.log('users query OK:', r3.rows.length, 'rows');
  } catch(e) {
    console.log('users query ERROR:', e.message);
  }

  await p.end();
}

main().catch(console.error);
