# Neon Setup Guide - Phase 2 Migration

This guide explains how to set up the PostgreSQL schema in your Neon database.

## Prerequisites

✅ You have: 
- Neon account created
- Database provisioned (`interviewguru_db`)
- Connection string in `.env` as `DATABASE_URL`

## Step 1: Access Neon SQL Editor

1. Go to [Neon Console](https://console.neon.tech)
2. Select your project: **InterviewGuru**
3. Click the **SQL Editor** tab in the top navigation
4. Ensure you're connected to the `interviewguru_db` database

## Step 2: Copy & Execute the Migration

1. Open file: `server/migrations/001-init-users-table.sql`
2. Copy the entire SQL content
3. Paste into the Neon SQL Editor
4. Click **Execute** button
5. ✅ Confirm success: You should see:
   ```
   "CREATE TABLE" (users table)
   "CREATE INDEX" (x5 indexes)
   "CREATE TABLE" (sessions table)
   ... etc
   ```

**Alternative: Use Command Line (Advanced)**

If you prefer using psql CLI:

```bash
# Install psql (PostgreSQL client)
# On Windows: https://www.postgresql.org/download/windows/
# Add psql to PATH

# Run migration
psql "$DATABASE_URL" -f server/migrations/001-init-users-table.sql
```

## Step 3: Verify Table Creation

In Neon SQL Editor, run this query:

```sql
SELECT tablename FROM pg_tables WHERE schemaname = 'public';
```

Expected output:
```
 tablename
-----------
 users
 sessions
 audit_logs
```

## Step 4: Test Connection from App

1. Run the app locally:
   ```bash
   npm run electron:dev
   ```

2. Open DevTools (Ctrl+Shift+I)

3. Check console for:
   ```
   [DB] ✅ Connected to Neon PostgreSQL
   ```

4. Make a test question in chat mode

5. Expected: Console shows `[DB] Query failed: ...` is NOT present for user creation

6. Verify user was created in Neon:
   ```sql
   -- In Neon SQL Editor:
   SELECT user_id, email, plan FROM users LIMIT 5;
   ```

## Step 5: Monitor Quotas

During development, you can check quotas directly in Neon:

```sql
-- View all users and their quotas
SELECT user_id, email, plan, voice_minutes_used, chat_messages_used, current_month
FROM users
ORDER BY last_active_at DESC;

-- Check a specific user
SELECT * FROM users WHERE email = 'your_email@example.com';

-- See recent activity
SELECT * FROM audit_logs WHERE user_id = 'user_XXX' ORDER BY created_at DESC LIMIT 10;
```

## Troubleshooting

### Error: "duplicate key value violates unique constraint"

**Cause:** User already exists in database (from previous test run)

**Solution:**
```sql
-- Delete old test data
DELETE FROM sessions WHERE user_id IN (SELECT user_id FROM users WHERE email = 'test@example.com');
DELETE FROM users WHERE email = 'test@example.com';
```

### Error: "connection refused" or "CLIENT_REQUIRE_ENCRYPTION"

**Cause:** DATABASE_URL is invalid or network issue

**Solution:**
1. Double-check `.env` file has correct `DATABASE_URL`
2. Restart `npm run electron:dev`
3. Check Neon dashboard status

### Users not syncing to database

**This is normal!** The file-based storage (`~/.interviewguru/users.json`) is primary. Database syncs are async and non-blocking.

To debug:
1. Check `/tmp/interviewguru_cache/users.json` (file should be updated)
2. Check Neon SQL Editor for user record
3. If file updated but DB not, check browser console for `[DB]` errors

## Next Steps

Once tables are created and tests pass:

1. ✅ Phase 2: Tables created (YOU ARE HERE)
2. ⏳ Phase 3: Test locally with app
3. ⏳ Phase 4: Deploy to Vercel
4. ⏳ Phase 5: Production verification

## How Hybrid Storage Works

**During app startup:**
1. App loads file-based users from `~/.interviewguru/users.json`
2. All quota updates go to file immediately (sync)
3. Database updates happen asynchronously in background
4. If database call fails → app continues anyway (file is primary)

**This means:**
- ✅ App works offline or without DATABASE_URL
- ✅ Quotas persist across sessions (file storage)
- ✅ When deployed to Vercel, cloud database provides persistence
- ⚠️ May see 5-10 second delay before database sync completes

## Database Architecture Summary

**File Storage** (Primary):
- Location: `~/.interviewguru/users.json`
- Purpose: Immediate, reliable quota enforcement
- Persists: Across app restarts

**PostgreSQL** (Secondary/Cloud):
- Purpose: Cloud persistence for multi-instance deployments
- When used: On Vercel (serverless functions can't use shared filesystem)
- Fallback: If DATABASE_URL missing, app uses file-only mode

**Result:**
- Local dev: File-based (fast, no DB needed)
- Vercel prod: PostgreSQL + file fallback
- Best of both worlds! ✨
