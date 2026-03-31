import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_4aO1ioEjIchC@ep-late-lab-amec9aro-pooler.c-5.us-east-1.aws.neon.tech/interviewguru-prod?sslmode=require',
  connectionTimeoutMillis: 5000,
  ssl: { rejectUnauthorized: false }
});

const createTableQuery = `
  CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255),
    plan VARCHAR(50) DEFAULT 'free',
    trials_used BOOLEAN DEFAULT FALSE,
    trial_start_date BIGINT,
    subscription_status VARCHAR(50) DEFAULT 'trial',
    current_month VARCHAR(7),
    voice_minutes_used INTEGER DEFAULT 0,
    chat_messages_used INTEGER DEFAULT 0,
    sessions_used INTEGER DEFAULT 0,
    active_sessions JSONB DEFAULT '[]',
    session_history JSONB DEFAULT '[]',
    created_at BIGINT NOT NULL,
    last_active_at BIGINT NOT NULL,
    stripe_customer_id VARCHAR(255),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_user_id ON users(user_id);
  CREATE INDEX IF NOT EXISTS idx_email ON users(email);
`;

(async () => {
  try {
    console.log('Creating users table in Neon...');
    await pool.query(createTableQuery);
    console.log('✓ Users table created successfully!');
    
    // Verify table was created
    const result = await pool.query(
      "SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename='users'"
    );
    
    if (result.rows.length > 0) {
      console.log('✓ Verified: users table exists in Neon');
      console.log('\nTable schema:');
      const cols = await pool.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'users'
        ORDER BY ordinal_position
      `);
      cols.rows.forEach(col => {
        console.log(`  - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'YES' ? '(nullable)' : '(required)'}`);
      });
    } else {
      console.error('✗ Table creation failed - table not found');
    }
    
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('✗ Error creating table:', error);
    await pool.end();
    process.exit(1);
  }
})();
