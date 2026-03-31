import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_4aO1ioEjIchC@ep-late-lab-amec9aro-pooler.c-5.us-east-1.aws.neon.tech/interviewguru-prod?sslmode=require',
  connectionTimeoutMillis: 5000,
  ssl: { rejectUnauthorized: false }
});

pool.query(
  'SELECT user_id, plan, chat_messages_used, voice_minutes_used, created_at FROM users WHERE user_id = $1 LIMIT 1;',
  ['user_3BhAHnTnH0mLrsO82c4zWEPneCZ'],
  (err, res) => {
    if (err) {
      console.error('[DB Query Error]', err.message);
    } else if (res.rows.length > 0) {
      console.log('\n[✓ NEON DATABASE SYNCED]');
      console.log('User ID:', res.rows[0].user_id);
      console.log('Plan:', res.rows[0].plan);
      console.log('Chat Messages Used:', res.rows[0].chat_messages_used);
      console.log('Voice Minutes Used:', res.rows[0].voice_minutes_used);
      console.log('Created At:', new Date(res.rows[0].created_at).toLocaleString());
    } else {
      console.log('[DB] No user found in Neon yet');
    }
    pool.end();
  }
);
