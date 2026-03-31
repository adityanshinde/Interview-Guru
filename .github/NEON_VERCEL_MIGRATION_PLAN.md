# 🚀 InterviewGuru: Neon + Vercel Migration Plan

**Objective:** Migrate from local file-based storage to cloud-hosted Neon PostgreSQL + Vercel for production-ready deployment.

**Timeline:** ~3-4 hours total  
**Cost:** $0 (both Neon and Vercel free tiers)  
**Risk Level:** LOW (fully reversible, can test locally first)

---

## 📋 Phase 1: Prerequisites & Setup (30 min)

### 1.1 Create Neon Account
- [ ] Go to https://neon.tech
- [ ] Sign up with email or GitHub
- [ ] Create a new project (name it: `interviewguru-prod`)
- [ ] Select **PostgreSQL 16** (latest)
- [ ] Select region closest to your users (e.g., US East if US-based)
- [ ] ✅ Database created automatically

### 1.2 Get Neon Connection String
- [ ] In Neon dashboard → **Connection string**
- [ ] Copy the full string (looks like):
  ```
  postgresql://neondb_owner:AbCdEfGhIjKlMnOp@ep-cool-cloud-12345.us-east-4.neon.tech/neondb?sslmode=require
  ```
- [ ] Save this somewhere safe (`.env` later)

### 1.3 Create Vercel Account
- [ ] Go to https://vercel.com
- [ ] Sign up with GitHub (easiest for CI/CD)
- [ ] Create new project (link to your Git repo later)

### 1.4 Install PostgreSQL Client (Local Testing)
```bash
# On Windows: Install pgAdmin or use online SQL editor
# For quick testing: Just use Neon's web editor (skip this if not needed)
```

---

## 🗄️ Phase 2: Database Schema Setup (15 min)

### 2.1 Create Tables in Neon

**Status: ✅ SCHEMA CREATED** - See `server/migrations/001-init-users-table.sql`

**Option A: Via Neon Web Editor (Recommended - 2 min)**

1. Open Neon dashboard → **SQL Editor**
2. Open file: `server/migrations/001-init-users-table.sql`
3. Copy the entire SQL content
4. Paste into Neon SQL Editor and click **Execute**
5. Success! You should see multiple "CREATE TABLE" messages

```sql
-- ════════════════════════════════════════════════════════════════
-- InterviewGuru Users & Usage Tracking Schema
-- ════════════════════════════════════════════════════════════════

-- Main users table
CREATE TABLE IF NOT EXISTS users (
  -- Identity
  user_id VARCHAR(255) PRIMARY KEY,           -- Clerk user ID (e.g., user_123abc)
  email VARCHAR(255) NOT NULL UNIQUE,
  
  -- Plan & Subscription
  plan VARCHAR(50) NOT NULL DEFAULT 'free',   -- free|basic|pro|enterprise
  subscription_status VARCHAR(50) NOT NULL DEFAULT 'trial',  -- trial|active|expired|cancelled
  
  -- Trial Tracking
  trial_used BOOLEAN DEFAULT FALSE,
  trial_start_date BIGINT,                    -- Unix timestamp
  
  -- Monthly Usage (Reset on month boundary)
  current_month VARCHAR(7) NOT NULL,          -- Format: "2026-03"
  voice_minutes_used INT DEFAULT 0,
  chat_messages_used INT DEFAULT 0,
  sessions_used INT DEFAULT 0,
  
  -- Metadata
  stripe_customer_id VARCHAR(255),            -- For future Stripe integration
  created_at BIGINT NOT NULL,                 -- Unix timestamp
  updated_at BIGINT NOT NULL,                 -- Unix timestamp
  
  -- Indexing for fast lookups
  INDEX idx_email (email),
  INDEX idx_current_month (current_month)
);

-- Session history (optional, for analytics)
CREATE TABLE IF NOT EXISTS sessions (
  session_id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  start_time BIGINT NOT NULL,
  end_time BIGINT,
  questions_asked INT DEFAULT 0,
  voice_minutes_used INT DEFAULT 0,
  status VARCHAR(50) DEFAULT 'active',        -- active|completed|abandoned
  created_at BIGINT NOT NULL,
  
  INDEX idx_user_id (user_id),
  INDEX idx_start_time (start_time)
);

-- Audit log (optional, for debugging quota issues)
CREATE TABLE IF NOT EXISTS audit_logs (
  log_id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  action VARCHAR(100) NOT NULL,               -- record_chat|record_voice|reset_quota|upgrade_plan
  details TEXT,                               -- JSON blob of what changed
  created_at BIGINT NOT NULL,
  
  INDEX idx_user_id (user_id),
  INDEX idx_created_at (created_at)
);

-- ════════════════════════════════════════════════════════════════
-- Test data (optional, remove before production)
-- ════════════════════════════════════════════════════════════════

INSERT INTO users (
  user_id, email, plan, subscription_status, current_month, 
  created_at, updated_at
) VALUES (
  'test_user_001',
  'test@example.com',
  'free',
  'trial',
  '2026-03',
  EXTRACT(EPOCH FROM NOW())::BIGINT,
  EXTRACT(EPOCH FROM NOW())::BIGINT
) ON CONFLICT DO NOTHING;

-- ════════════════════════════════════════════════════════════════
-- Schema complete! Ready for data migration.
-- ════════════════════════════════════════════════════════════════
```

3. Click **Execute query**
4. ✅ Tables created!

**Option B: Via SQL file + psql (Advanced)**
```bash
# If you have psql installed:
psql postgresql://user:pass@host/db -f schema.sql
```

### 2.2 Verify Tables

In Neon SQL Editor:
```sql
-- Check tables were created
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public';
-- Should output: users, sessions, audit_logs
```

---

## 💻 Phase 3: Update Backend Code (1.5 hours)

**Status: ✅ COMPLETED** - Hybrid storage layer implemented

### 3.1 Install PostgreSQL Driver ✅
```bash
npm install pg @types/pg
# Result: "added 14 packages"
```

### 3.2 Create Database Module ✅
**File:** `server/lib/database.ts` (CREATED)
- Connection pooling with `pg` driver
- SSL support for Neon
- Graceful degradation (works without DATABASE_URL)
- Query helpers: queryDatabase(), queryDatabaseSingle(), executeDatabase()

### 3.3 Update Usage Storage ✅
**File:** `server/lib/usageStorage.ts` (UPDATED - HYBRID MODE)

Changes made:
- ✅ Imported database functions
- ✅ Updated `recordVoiceUsage()` - async DB calls in background
- ✅ Updated `recordChatUsage()` - async DB calls in background
- ✅ Updated `saveUsers()` - UPSERT to database for all user records
- ✅ Updated `upgradeUserPlan()` - async DB updates on plan changes

**Key Feature:** Hybrid approach keeps file storage primary, database syncs asynchronously
- File-based storage remains active and reliable (1st priority)
- Database calls fire in background (non-blocking)
- Automatic fallback if DATABASE_URL not set
- **Never breaks existing functionality** ✨

### 3.4 Server Build ✅
```bash
npm run build:server
# Output: CJS server.cjs 50.67 KB - Build success in 90ms ✅
```

### 3.5 Update server.ts Initialization
}

export async function queryDatabaseSingle(
  query: string,
  params: any[] = []
): Promise<any> {
  const rows = await queryDatabase(query, params);
  return rows[0] || null;
}

export async function executeDatabase(
  query: string,
  params: any[] = []
): Promise<void> {
  await queryDatabase(query, params);
}

export async function closeDatabase(): Promise<void> {
  await pool.end();
}

export { Pool, PoolClient };
```

### 3.3 Replace `usageStorage.ts`

**File:** `server/lib/usageStorage.ts` (REPLACE)

```typescript
import { queryDatabase, queryDatabaseSingle, executeDatabase } from './database';
import { UserRecord } from '../src/lib/types';

const MONTH_FORMAT = (): string => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

// ════════════════════════════════════════════════════════════════
// ✅ Core CRUD Operations
// ════════════════════════════════════════════════════════════════

export async function loadUsers(): Promise<UserRecord[]> {
  const query = `
    SELECT 
      user_id as "userId",
      email,
      plan,
      subscription_status as "subscriptionStatus",
      trial_used as "trialsUsed",
      trial_start_date as "trialStartDate",
      current_month as "currentMonth",
      voice_minutes_used as "voiceMinutesUsed",
      chat_messages_used as "chatMessagesUsed",
      sessions_used as "sessionsUsed",
      stripe_customer_id as "stripeCustomerId",
      created_at as "createdAt",
      updated_at as "updatedAt"
    FROM users
  `;
  
  const rows = await queryDatabase(query);
  return rows.map((row: any) => ({
    userId: row.userId,
    email: row.email,
    plan: row.plan,
    subscriptionStatus: row.subscriptionStatus,
    trialsUsed: row.trialsUsed,
    trialStartDate: row.trialStartDate,
    currentMonth: row.currentMonth,
    voiceMinutesUsed: row.voiceMinutesUsed,
    chatMessagesUsed: row.chatMessagesUsed,
    sessionsUsed: row.sessionsUsed,
    stripeCustomerId: row.stripeCustomerId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }));
}

export async function saveUsers(users: UserRecord[]): Promise<void> {
  // For each user, upsert (insert or update)
  for (const user of users) {
    const query = `
      INSERT INTO users (
        user_id, email, plan, subscription_status, trial_used,
        trial_start_date, current_month, voice_minutes_used,
        chat_messages_used, sessions_used, stripe_customer_id,
        created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      ON CONFLICT (user_id) DO UPDATE SET
        email = $2,
        plan = $3,
        subscription_status = $4,
        trial_used = $5,
        trial_start_date = $6,
        current_month = $7,
        voice_minutes_used = $8,
        chat_messages_used = $9,
        sessions_used = $10,
        stripe_customer_id = $11,
        updated_at = $13
    `;

    const now = Math.floor(Date.now() / 1000); // Unix timestamp
    await executeDatabase(query, [
      user.userId,
      user.email,
      user.plan,
      user.subscriptionStatus,
      user.trialsUsed || false,
      user.trialStartDate || null,
      user.currentMonth,
      user.voiceMinutesUsed,
      user.chatMessagesUsed,
      user.sessionsUsed,
      user.stripeCustomerId || null,
      user.createdAt || now,
      now,
    ]);
  }
}

export function createNewUserRecord(
  userId: string,
  email: string
): UserRecord {
  const now = Math.floor(Date.now() / 1000);
  return {
    userId,
    email,
    plan: 'free',
    subscriptionStatus: 'trial',
    trialsUsed: false,
    trialStartDate: now,
    currentMonth: MONTH_FORMAT(),
    voiceMinutesUsed: 0,
    chatMessagesUsed: 0,
    sessionsUsed: 0,
    createdAt: now,
    lastActiveAt: now,
    activeSessions: [],
    sessionHistory: [],
  };
}

// ════════════════════════════════════════════════════════════════
// ✅ Usage Recording
// ════════════════════════════════════════════════════════════════

export async function recordVoiceUsage(
  userId: string,
  minutes: number
): Promise<void> {
  const query = `
    UPDATE users
    SET voice_minutes_used = voice_minutes_used + $1,
        updated_at = $2
    WHERE user_id = $3
  `;

  const now = Math.floor(Date.now() / 1000);
  await executeDatabase(query, [minutes, now, userId]);

  // Log to audit trail
  await executeDatabase(
    `INSERT INTO audit_logs (user_id, action, details, created_at)
     VALUES ($1, $2, $3, $4)`,
    [userId, 'record_voice', JSON.stringify({ minutes }), now]
  );
}

export async function recordChatUsage(
  userId: string,
  count: number
): Promise<void> {
  const query = `
    UPDATE users
    SET chat_messages_used = chat_messages_used + $1,
        updated_at = $2
    WHERE user_id = $3
  `;

  const now = Math.floor(Date.now() / 1000);
  await executeDatabase(query, [count, now, userId]);

  // Log to audit trail
  await executeDatabase(
    `INSERT INTO audit_logs (user_id, action, details, created_at)
     VALUES ($1, $2, $3, $4)`,
    [userId, 'record_chat', JSON.stringify({ count }), now]
  );
}

// ════════════════════════════════════════════════════════════════
// ✅ Quota Tracking
// ════════════════════════════════════════════════════════════════

export async function getRemainingQuota(
  userId: string,
  quotaType: 'voice' | 'chat' | 'session'
): Promise<number> {
  const user = await queryDatabaseSingle(
    'SELECT plan, voice_minutes_used, chat_messages_used, sessions_used FROM users WHERE user_id = $1',
    [userId]
  );

  if (!user) return 0;

  const LIMITS: Record<string, Record<string, number>> = {
    'free': { voice: 10, chat: 10, session: 1 },
    'basic': { voice: 60, chat: 500, session: 1 },
    'pro': { voice: 600, chat: 5000, session: 10 },
    'enterprise': { voice: 999999, chat: 999999, session: 999999 },
  };

  const limit = LIMITS[user.plan]?.[quotaType === 'voice' ? 'voice' : quotaType === 'chat' ? 'chat' : 'session'] || 0;
  const used = quotaType === 'voice' ? user.voice_minutes_used : quotaType === 'chat' ? user.chat_messages_used : user.sessions_used;

  return Math.max(0, limit - used);
}

// ════════════════════════════════════════════════════════════════
// ✅ Monthly Reset
// ════════════════════════════════════════════════════════════════

export async function resetMonthlyUsageIfNeeded(user: UserRecord): Promise<void> {
  const currentMonth = MONTH_FORMAT();

  if (user.currentMonth !== currentMonth) {
    const query = `
      UPDATE users
      SET current_month = $1,
          voice_minutes_used = 0,
          chat_messages_used = 0,
          sessions_used = 0,
          updated_at = $2
      WHERE user_id = $3
    `;

    const now = Math.floor(Date.now() / 1000);
    await executeDatabase(query, [currentMonth, now, user.userId]);

    console.log(`[Quota Reset] User ${user.userId} quotas reset for month ${currentMonth}`);
  }
}

// ════════════════════════════════════════════════════════════════
// ✅ Trial Management
// ════════════════════════════════════════════════════════════════

export function calculateTrialDaysRemaining(user: UserRecord): number {
  if (!user.trialStartDate) return 0;

  const trialEndDate = new Date((user.trialStartDate + 7 * 24 * 60 * 60) * 1000);
  const now = new Date();
  const daysRemaining = Math.ceil((trialEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  return Math.max(0, daysRemaining);
}

export function checkTrialExpired(user: UserRecord): boolean {
  if (user.plan !== 'free' || !user.trialsUsed) return false;

  const trialEndDate = new Date((user.trialStartDate! + 7 * 24 * 60 * 60) * 1000);
  return new Date() > trialEndDate;
}

// ════════════════════════════════════════════════════════════════
// ✅ Plan Management
// ════════════════════════════════════════════════════════════════

export async function upgradeUserPlan(
  userId: string,
  newPlan: string
): Promise<void> {
  const query = `
    UPDATE users
    SET plan = $1,
        subscription_status = $2,
        voice_minutes_used = 0,
        chat_messages_used = 0,
        sessions_used = 0,
        updated_at = $3
    WHERE user_id = $4
  `;

  const now = Math.floor(Date.now() / 1000);
  await executeDatabase(query, [newPlan, 'active', now, userId]);

  // Log upgrade
  await executeDatabase(
    `INSERT INTO audit_logs (user_id, action, details, created_at)
     VALUES ($1, $2, $3, $4)`,
    [userId, 'upgrade_plan', JSON.stringify({ newPlan }), now]
  );
}
```

### 3.4 Update `server.ts`

**Add to top of file:**
```typescript
import { queryDatabase, queryDatabaseSingle, executeDatabase, closeDatabase } from './server/lib/database';

// Replace file-based imports with database functions
// (Already importing from usageStorage, no changes needed there!)
```

**Add graceful shutdown:**
```typescript
// At the end of server.ts (before listening):
process.on('SIGTERM', async () => {
  console.log('[Server] SIGTERM received, closing DB connection...');
  await closeDatabase();
  process.exit(0);
});
```

---

## 🧪 Phase 4: Local Testing (30 min) ← **YOU ARE HERE**

### 4.1 Verify .env Setup ✅
```env
# Check your .env file has:
DATABASE_URL=postgresql://neondb_owner:...@...us-east-4.neon.tech/neondb?sslmode=require
```

### 4.2 Test Locally

**Step 1: Start the app**
```bash
npm run electron:dev
```

**Step 2: Check database connection**
```
Expected in terminal: "[DB] ✅ Connected to Neon PostgreSQL"
Or if no DATABASE_URL: "[DB] DATABASE_URL not set - database features disabled"
```

**Step 3: Create test tables in Neon**
1. Open Neon SQL Editor
2. Copy & paste contents of: `server/migrations/001-init-users-table.sql`
3. Click Execute
4. Verify success (see "CREATE TABLE" messages)
5. See setup guide: `docs/NEON_SETUP_GUIDE.md`

**Step 4: Test API call (quota recording)**
1. In app: Sign in with Clerk
2. Ask a question in chat mode
3. Wait for answer
4. Check Neon SQL Editor:
   ```sql
   SELECT user_id, email, chat_messages_used FROM users ORDER BY created_at DESC LIMIT 1;
   ```
5. Expected: chat_messages_used = 1 ✓

**Step 5:VerifyFile Storage (primary storage works)**
1. File should exist: `~/.interviewguru/users.json`
2. Should contain your user record with `chatMessagesUsed: 1`
3. Confirm: **File storage = primary, DB = async backup** 👍

### 4.3 Troubleshooting

**Issue: No database connection**
- Check .env has DATABASE_URL
- Restart app: `npm run electron:dev`
- Check network connectivity

**Issue: Tables don't exist in Neon**
- Execute migration in Neon SQL Editor (Phase 4.2, Step 3)
- Verify user logged in with Clerk

**Issue: File works, but Neon shows old data**
- This is normal! Database syncs are async (5-10 second delay)
- Check again in 10 seconds

---

## 🌐 Phase 5: Environment Variables & Vercel Setup (15 min)

### 5.1 Vercel Account Setup ✅
- [ ] Created Vercel account (from Phase 1.3)
- [ ] Ready to link GitHub repo
```

### 5.2 Connect GitHub to Vercel

1. **Go to https://vercel.com/dashboard**
2. Click **+ New Project**
3. Select your InterviewGuru GitHub repo
4. Framework: **Other** (we have custom Express setup)
5. Root Directory: **`.`** (root)
6. Build Command: `npm run build`
7. Output Directory: `dist`
8. ✅ **Create Project**

### 5.3 Add Environment Variables to Vercel

1. In Vercel project → **Settings** → **Environment Variables**
2. Add each variable:

| Key | Value | Environment |
|-----|-------|-------------|
| `DATABASE_URL` | `postgresql://...` | Production, Preview, Development |
| `GROQ_API_KEY` | Your key | Production, Preview, Development |
| `GEMINI_API_KEY` | Your key | Production, Preview, Development |
| `VITE_CLERK_PUBLISHABLE_KEY` | Your key | Production, Preview, Development |
| `NODE_ENV` | `production` | Production |

3. ✅ **Save**

### 5.4 Deploy

1. Vercel automatically deploys when you push to `main`
2. Or click **Deploy** manually
3. Wait for build to complete (~3-5 min)
4. ✅ Get your Vercel URL (e.g., `https://interviewguru.vercel.app`)

### 5.5 Test Deployment

```bash
# Replace with your Vercel URL
curl https://interviewguru.vercel.app/api/health
# Response: { "status": "ok" }
```

---

## 🧪 Phase 6: Testing (30 min)

### 6.1 Local Testing

**Test database connection:**
```bash
npm run electron:dev
# Check console for: "[DB] Query successful" messages
```

**Test quota recording:**
```bash
# In browser DevTools Console:
// Ask a question, watch Network tab
// Check /api/analyze response: should have fresh quota data
// Refresh page, quotas should persist (from database)
```

### 6.2 Production Testing (Vercel)

1. **Update Electron app to use Vercel backend** (optional)
   ```typescript
   // In useAIAssistant.ts:
   const API_BASE = process.env.NODE_ENV === 'production' 
     ? 'https://interviewguru.vercel.app'
     : 'http://localhost:3000';
   ```

2. **Test via curl:**
   ```bash
   # Get mock token (for testing)
   TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
   
   curl -X GET https://interviewguru.vercel.app/api/usage \
     -H "Authorization: Bearer $TOKEN"
   # Should return quota data from Neon
   ```

### 6.3 Verify Data in Neon

**In Neon SQL Editor:**
```sql
-- Check users table
SELECT * FROM users;

-- Check audit logs
SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 10;
```

---

## 🔄 Phase 7: Data Migration (Optional - For Existing Data)

If you have existing user data in the old JSON file:

### 7.1 Export Old Data

```typescript
// In a Node.js script:
const fs = require('fs');
const path = require('path');
const os = require('os');

const CACHE_FILE = path.join(os.tmpdir(), 'interviewguru_users.json');
const users = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8'));

console.log(JSON.stringify(users, null, 2));
// Copy output to file
```

### 7.2 Import to Neon

```typescript
// Use saveUsers() function
import { saveUsers } from './server/lib/usageStorage';

const oldUsers = [ /* parsed from JSON */ ];
await saveUsers(oldUsers);
// Data migrated!
```

---

## ⚠️ Phase 8: Rollback Plan

If something breaks:

### 8.1 Revert to File-Based Storage

```bash
# 1. Stop production deployment
git checkout origin/main~1  # Go back one commit

# 2. Revert usageStorage.ts to old version
git checkout origin/main~1 -- server/lib/usageStorage.ts

# 3. Remove database.ts
rm server/lib/database.ts

# 4. Redeploy
git push origin main
# Vercel auto-deploys
```

### 8.2 Verify Rollback

```bash
curl https://interviewguru.vercel.app/api/health
# Should work, using file-based storage again
```

---

## 📊 Phase 9: Monitoring & Maintenance

### 9.1 Monitor Neon Usage

**In Neon Dashboard:**
- CPU usage (should be near 0 for 50-100 users)
- Storage growth (track for upgrade decisions)
- Query logs (diagnose performance issues)

### 9.2 Monitor Vercel Logs

**In Vercel Dashboard:**
- Function logs (real-time errors)
- Deployment history (track changes)
- Performance metrics (response times)

### 9.3 Audit Logs

**Check audit trail for issues:**
```sql
-- In Neon SQL Editor
SELECT * FROM audit_logs 
WHERE created_at > EXTRACT(EPOCH FROM NOW() - INTERVAL '7 days')
ORDER BY created_at DESC;
```

---

## 📈 Timeline & Checklist

**Day 1 (Phase 1-2): Setup (45 min)**
- [ ] Create Neon account
- [ ] Create database + tables
- [ ] Copy connection string

**Day 1-2 (Phase 3): Backend Updates (1.5 hours)**
- [ ] Install pg driver
- [ ] Create `database.ts`
- [ ] Replace `usageStorage.ts`
- [ ] Update `server.ts`

**Day 2 (Phase 4): Environment (10 min)**
- [ ] Update `.env`
- [ ] Test locally

**Day 2 (Phase 5): Deployment (45 min)**
- [ ] Push to GitHub
- [ ] Connect Vercel
- [ ] Add environment variables
- [ ] Deploy

**Day 2-3 (Phase 6-7): Testing & Migration (1 hour)**
- [ ] Test locally & production
- [ ] Migrate old data (if needed)

**Total Time: 3-4 hours** ⏱️

---

## 🎯 Success Criteria

✅ All of the following working:

1. **Neon Database**
   - [ ] Tables created
   - [ ] Connection string working
   - [ ] Data persists across restarts

2. **Backend Code**
   - [ ] `database.ts` imported without errors
   - [ ] `usageStorage.ts` uses PostgreSQL queries
   - [ ] Graceful shutdown on SIGTERM

3. **Local Testing**
   - [ ] `npm run electron:dev` starts without errors
   - [ ] Quotas update after asking questions
   - [ ] Quotas persist after page refresh
   - [ ] Monthly reset works

4. **Vercel Deployment**
   - [ ] `/api/health` returns 200
   - [ ] `/api/usage` returns quota data
   - [ ] Environment variables set correctly
   - [ ] No cold-start errors after 5 min idle

5. **Production Ready**
   - [ ] Data in Neon (verified via SQL)
   - [ ] Audit logs recording (verified via SQL)
   - [ ] Can rollback if needed
   - [ ] Monitoring dashboards accessible

---

## 📞 Troubleshooting

| Issue | Solution |
|-------|----------|
| `Connection refused` | Check DATABASE_URL is copied correctly |
| `SSL certificate error` | Neon requires SSL; ensure `sslmode=require` in URL |
| `ECONNREFUSED` locally | Neon might be taking requests from IP whitelist; check Neon dashboard |
| Vercel Build fails | Check logs in Vercel dashboard; npm dependencies might be missing |
| Database quota hit | Upgrade Neon plan to Launch ($15/mo) |
| Cold starts > 10s | Normal for Vercel free; upgrade to Pro for guaranteed fast starts |

---

## ✨ Next Steps After Deployment

1. **Add Stripe payments** (future phase)
2. **Set up real Clerk JWT verification** (against JWKS)
3. **Enable auto-backups** in Neon
4. **Set up alerts** for quota/performance
5. **Document deployment process** for team

---

**Document Created:** March 31, 2026  
**Status:** Ready for Implementation  
**Questions?** Check troubleshooting section or review specific phase
