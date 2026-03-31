import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const { Pool } = pg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_4aO1ioEjIchC@ep-late-lab-amec9aro-pooler.c-5.us-east-1.aws.neon.tech/interviewguru-prod?sslmode=require',
  connectionTimeoutMillis: 5000,
  ssl: { rejectUnauthorized: false }
});

(async () => {
  try {
    // Read file storage
    const usersFile = path.join(process.env.USERPROFILE, '.interviewguru', 'users.json');
    
    if (!fs.existsSync(usersFile)) {
      console.log('✓ No file storage found - nothing to migrate');
      await pool.end();
      process.exit(0);
    }

    const fileContent = fs.readFileSync(usersFile, 'utf-8');
    const users = JSON.parse(fileContent);

    console.log(`Migrating ${users.length} user(s) from file storage to Neon...`);
    
    for (const user of users) {
      // Create INSERT query
      const query = `
        INSERT INTO users (
          user_id, email, plan, trials_used, trial_start_date,
          subscription_status, current_month, voice_minutes_used,
          chat_messages_used, sessions_used,
          created_at, last_active_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        ON CONFLICT (user_id) 
        DO UPDATE SET
          email = COALESCE(EXCLUDED.email, users.email),
          plan = EXCLUDED.plan,
          trials_used = EXCLUDED.trials_used,
          trial_start_date = EXCLUDED.trial_start_date,
          subscription_status = EXCLUDED.subscription_status,
          current_month = EXCLUDED.current_month,
          voice_minutes_used = EXCLUDED.voice_minutes_used,
          chat_messages_used = EXCLUDED.chat_messages_used,
          sessions_used = EXCLUDED.sessions_used,
          last_active_at = EXCLUDED.last_active_at,
          updated_at = CURRENT_TIMESTAMP
        RETURNING user_id, plan, chat_messages_used;
      `;

      const result = await pool.query(query, [
        user.userId,
        user.email || null,
        user.plan,
        user.trialsUsed,
        user.trialStartDate ? new Date(user.trialStartDate) : null,
        user.subscriptionStatus,
        user.currentMonth,
        user.voiceMinutesUsed,
        user.chatMessagesUsed,
        user.sessionsUsed,
        new Date(user.createdAt),
        new Date(user.lastActiveAt)
      ]);

      console.log(`  ✓ Migrated: ${result.rows[0].user_id} (${result.rows[0].plan}, ${result.rows[0].chat_messages_used} chats)`);
    }

    console.log(`\n✅ Migration complete! ${users.length} user(s) synced to Neon`);
    
    // Verify
    const verify = await pool.query('SELECT COUNT(*) FROM users');
    console.log(`Total users in Neon: ${verify.rows[0].count}`);

    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('✗ Migration failed:', error.message);
    await pool.end();
    process.exit(1);
  }
})();
