import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_4aO1ioEjIchC@ep-late-lab-amec9aro-pooler.c-5.us-east-1.aws.neon.tech/interviewguru-prod?sslmode=require',
  ssl: { rejectUnauthorized: false }
});

(async () => {
  try {
    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name='users'
      ORDER BY ordinal_position
    `);
    
    console.log('Actual columns in users table:');
    result.rows.forEach(col => {
      console.log(`  ${col.column_name}: ${col.data_type}`);
    });
    
    await pool.end();
  } catch (error) {
    console.error('Error:', error.message);
    await pool.end();
  }
})();
