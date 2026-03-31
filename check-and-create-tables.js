const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  try {
    console.log('Checking database tables...\n');
    
    // Check what tables exist
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    console.log('Existing tables:');
    if (result.rows.length === 0) {
      console.log('  ❌ NO TABLES FOUND - Database is empty!');
    } else {
      result.rows.forEach(r => console.log(`  ✓ ${r.table_name}`));
    }
    
    // Check if sessions table exists
    const sessionsExist = result.rows.some(r => r.table_name === 'sessions');
    const usersExist = result.rows.some(r => r.table_name === 'users');
    
    console.log('\nTable status:');
    console.log(`  Users table: ${usersExist ? '✓ EXISTS' : '❌ MISSING'}`);
    console.log(`  Sessions table: ${sessionsExist ? '✓ EXISTS' : '❌ MISSING'}`);
    
    // If tables don't exist, offer to create them
    if (!usersExist || !sessionsExist) {
      console.log('\n⚠️  Required tables are missing!');
      console.log('Run the migration: node server/lib/runMigration.js');
    } else {
      console.log('\n✓ All required tables exist!');
    }
    
    await pool.end();
  } catch (err) {
    console.error('Error:', err.message);
  }
}

main();
