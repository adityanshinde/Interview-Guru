const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function testSessionCreation() {
  try {
    console.log('='.repeat(80));
    console.log('TESTING NEON SESSION CREATION');
    console.log('='.repeat(80));

    // 1. Check if users table has any users
    console.log('\n1. Checking users table...');
    const usersResult = await pool.query('SELECT user_id, email, plan FROM users LIMIT 5');
    console.log(`   Found ${usersResult.rows.length} users`);
    if (usersResult.rows.length > 0) {
      console.log('   First user:', usersResult.rows[0]);
    }

    if (usersResult.rows.length === 0) {
      console.log('   ❌ NO USERS IN DATABASE - Can\'t test session creation!');
      await pool.end();
      return;
    }

    const testUserId = usersResult.rows[0].user_id;
    console.log(`   ✓ Using user: ${testUserId}`);

    // 2. Check sessions table structure
    console.log('\n2. Checking sessions table schema...');
    const schemaResult = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'sessions'
      ORDER BY ordinal_position
    `);
    console.log(`   Columns in sessions table:`);
    schemaResult.rows.forEach(col => {
      console.log(`     - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? '(NOT NULL)' : ''}`);
    });

    // 3. Count existing sessions before insert
    console.log('\n3. Checking existing sessions...');
    const countBefore = await pool.query('SELECT COUNT(*) as count FROM sessions');
    console.log(`   Sessions in DB before: ${countBefore.rows[0].count}`);

    // 4. Test INSERT with detailed logging
    console.log('\n4. Attempting INSERT into sessions...');
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    console.log(`   Session ID: ${sessionId}`);
    console.log(`   User ID: ${testUserId}`);
    console.log(`   Status: active`);

    const insertQuery = `
      INSERT INTO sessions (user_id, session_id, start_time, status)
      VALUES ($1, $2, CURRENT_TIMESTAMP, 'active')
      RETURNING *;
    `;

    console.log(`   Query: ${insertQuery}`);
    console.log(`   Parameters: [${testUserId}, ${sessionId}]`);

    const insertResult = await pool.query(insertQuery, [testUserId, sessionId]);
    
    console.log(`   ✓ Insert successful!`);
    console.log(`   Returned row:`, insertResult.rows[0]);

    // 5. Verify it was inserted
    console.log('\n5. Verifying insert...');
    const verifyResult = await pool.query(
      'SELECT * FROM sessions WHERE session_id = $1',
      [sessionId]
    );
    
    if (verifyResult.rows.length > 0) {
      console.log(`   ✓ Session found in database!`);
      console.log(`   Data:`, verifyResult.rows[0]);
    } else {
      console.log(`   ❌ Session NOT found after insert!`);
    }

    // 6. Count after insert
    console.log('\n6. Final session count...');
    const countAfter = await pool.query('SELECT COUNT(*) as count FROM sessions');
    console.log(`   Sessions in DB after: ${countAfter.rows[0].count}`);
    console.log(`   Inserted: ${countAfter.rows[0].count - countBefore.rows[0].count} row(s)`);

    console.log('\n' + '='.repeat(80));
    if (countAfter.rows[0].count > countBefore.rows[0].count) {
      console.log('✓ DATABASE INSERT WORKING CORRECTLY');
    } else {
      console.log('❌ DATA NOT BEING PERSISTED TO DATABASE');
    }
    console.log('='.repeat(80));

    await pool.end();
  } catch (err) {
    console.error('\n❌ ERROR:', err.message);
    console.error('Stack:', err.stack);
    await pool.end();
  }
}

testSessionCreation();
