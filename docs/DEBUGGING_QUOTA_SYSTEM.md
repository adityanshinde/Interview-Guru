# Quota System Debugging Guide

## Recent Fixes Applied ✅

1. **Database Module Initialization** - Added `initializeDatabase()` call at server startup
2. **Comprehensive Logging** - Added detailed console logs to track quota updates
3. **Error Handling** - Better error messages to identify issues

---

## 🔍 Diagnostic Test (Step by Step)

### STEP 1: Start the App with Logging

```bash
npm run electron:dev
```

**Expected Output in Terminal:**
```
[Server] Initializing database pool...
[Server] Database pool initialized
Server running on http://localhost:3000
[DB] ✅ Connected to Neon PostgreSQL
   OR
[DB] DATABASE_URL not set - database features disabled
```

---

### STEP 2: Sign In with Clerk

1. Click the **Sign In** button in the OverlayWidget
2. Complete Clerk authentication
3. Return to the app

**Expected Output in Terminal:**
```
[Auth] Clerk user ID: user_XXXXX, email: your@email.com
[Auth] First-time user, creating record...
[Auth] ✓ User record created: plan=free, quotas reset
   OR (if already exists)
[Auth] Existing user: your@email.com, plan=free
```

---

### STEP 3: Ask a Test Question

1. Click the **Ask a Question** or chat input
2. Type a simple question: "What is REST API?"
3. Wait for the answer

**Expected Output in Terminal:**
```
[Auth] Clerk user ID: user_XXXXX, email: your@email.com
[Auth] Existing user: your@email.com, plan=free
[Usage] recordChatUsage called for user: user_XXXXX, count: 1
[Usage] User found: your@email.com, current chat messages: 0
[Usage] Updated chat messages: 1
[Usage] ✓ Saved to file storage
[Usage] DATABASE enabled, attempting async save...
   OR
[Usage] DATABASE disabled (no DATABASE_URL)

(If DATABASE_URL is set):
[Usage] ✓ Synced to Neon
   OR
[Usage] ✗ Failed to sync to Neon: <error message>
```

---

### STEP 4: Check File Storage

**1. Verify file was created:**
```bash
# On Windows PowerShell:
$file = "$env:USERPROFILE\.interviewguru\users.json"
if (Test-Path $file) {
    Write-Host "✓ File exists!"
    Get-Content $file | ConvertFrom-Json | ForEach-Object { $_ } | Format-Table
} else {
    Write-Host "✗ File NOT found!"
}
```

**Expected Output:**
```
user_id          email             plan  chatMessagesUsed
-------          -----             ----  ----------------
user_XXXXX       your@email.com    free  1
```

---

### STEP 5: Check Browser Console

1. Open **DevTools**: `Ctrl+Shift+I` (in Electron window)
2. Go to **Console** tab
3. Look for errors or warnings

**Expected (NO Errors):**
- No red error messages
- May see network requests: `/api/usage`

**Common Errors to Fix:**
```
❌ "Failed to fetch Bearer token"
   → Clerk not properly initialized

❌ "404 not found /api/usage"
   → Server endpoint missing or incorrect

❌ "User not authenticated"
   → JWT token not being sent correctly
```

---

## 🧠 How It Should Work (Flow Chart)

```
User Signs In + Asks Question
           ↓
    authMiddleware runs
           ↓
    User record created/verified
           ↓
    LLM generates answer
           ↓
    recordChatUsage(userId, 1) called
           ↓
    ┌──────────────────┴──────────────────┐
    ↓                                      ↓
File Storage (SYNC)           Database (ASYNC)
├─ Load users.json            ├─ executeDatabase()
├─ Find user                  ├─ INSERT/UPDATE
├─ chatMessagesUsed++ (1→2)   ├─ Wait for response
├─ Save to file               └─ Log result
└─ Return immediately
           ↓
  API returns answer to client
           ↓
  Frontend fetches /api/usage
           ↓
  UI shows quotas updated (1/10)
```

---

## ✅ Checklist: What Working Looks Like

- [ ] Terminal shows `[Auth] Clerk user ID: user_...`
- [ ] Terminal shows `[Usage] recordChatUsage called for user: user_...`
- [ ] Terminal shows `[Usage] ✓ Saved to file storage`
- [ ] File `~/.interviewguru/users.json` exists and contains user
- [ ] File shows `chatMessagesUsed: 1` after asking one question
- [ ] UI shows "1/10" quotas in the plan badge
- [ ] No red errors in browser console
- [ ] No red errors in terminal

---

## ❌ Common Issues & Fixes

### Issue 1: "User Record Created" But File Doesn't Exist

**Symptom:**
```
[Auth] ✓ User record created
but ~/.interviewguru/users.json NOT found
```

**Cause:** Directory not being created

**Fix:**
```bash
# Manually create directory
mkdir "$env:USERPROFILE\.interviewguru"
```

---

### Issue 2: "No quotas update" / "chatMessagesUsed still 0"

**Symptom:**
```
[Usage] recordChatUsage called...
[Usage] ✓ Saved to file storage
but file shows chatMessagesUsed: 0
```

**Cause:** Save might be failing silently OR file config path issue

**Fix:**
1. Check file permissions (writable?)
2. Add this test to verify save works:
```bash
# Manually test file write
Write-Host "Home: $env:USERPROFILE"
Test-Path "$env:USERPROFILE\.interviewguru"
```

---

### Issue 3: "DATABASE enabled" But "Failed to sync to Neon"

**Symptom:**
```
[Usage] DATABASE enabled, attempting async save...
[Usage] ✗ Failed to sync to Neon: connect ECONNREFUSED 127.0.0.1:5432
```

**Cause:** DATABASE_URL is invalid or Neon tables don't exist

**Fix:**
1. Check `.env` file has valid `DATABASE_URL`
2. Verify Neon tables exist:
   - Open Neon SQL Editor
   - Run: `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';`
   - Should show: `users`, `sessions`, `audit_logs`
3. If missing, execute migration:
   - Copy contents of `server/migrations/001-init-users-table.sql`
   - Paste into Neon SQL Editor
   - Click Execute

---

### Issue 4: Quotas Not Showing in UI

**Symptom:**
- Terminal shows quotas updating correctly
- Browser console shows no errors
- But UI still shows loading spinner or zeros

**Cause:** `usePlanStatus` hook not fetching correctly

**Debug:**
1. Open DevTools → Applications → Cookies
2. Verify Clerk session cookie exists
3. Go to Network tab, look for `/api/usage` request
4. Click the request, check:
   - Request Headers: Has `Authorization: Bearer ...`?
   - Response: Shows quotas correctly?

**Fix:**
- If `/api/usage` returns 401: Clerk auth not working
- If `/api/usage` not shown: Hook not being called

---

## 🚀 Quick Test Script

```bash
# 1. Check if directory exists
if (Test-Path "$env:USERPROFILE\.interviewguru") {
    Write-Host "✓ Directory exists"
} else {
    Write-Host "✗ Directory missing - creating..."
    mkdir "$env:USERPROFILE\.interviewguru"
}

# 2. Check if file exists
if (Test-Path "$env:USERPROFILE\.interviewguru\users.json") {
    Write-Host "✓ Users file exists"
    $users = Get-Content "$env:USERPROFILE\.interviewguru\users.json" | ConvertFrom-Json
    Write-Host "  Users: $($users.Length)"
    if ($users) {
        $users | ForEach-Object {
            Write-Host "    - $_email: chatMessages=$_.chatMessagesUsed"
        }
    }
} else {
    Write-Host "✗ Users file NOT found"
}

# 3. Show environment
Write-Host "`nEnvironment:"
Write-Host "  DATABASE_URL set: $(if ($env:DATABASE_URL) { 'YES' } else { 'NO' })"
Write-Host "  NODE_ENV: $env:NODE_ENV"
```

---

## 📋 What to Share With Me

When reporting an issue, please share:

1. **Full terminal output** (from `npm run electron:dev` start to error)
2. **File contents** of `~/.interviewguru/users.json`
3. **Browser console** screenshot (F12 → Console)
4. **What you did** (sign in, ask question, check quotas, etc.)

Example:
```
$ npm run electron:dev

[Server] Initializing database pool...
[Server] Database pool initialized
Server running on http://localhost:3000
[DB] DATABASE_URL not set - database features disabled

[Auth] Clerk user ID: user_2nXX..., email: test@example.com
[Auth] First-time user, creating record...
[Auth] ✓ User record created: plan=free, quotas reset

[Usage] recordChatUsage called for user: user_2nXX..., count: 1
[Usage] User found: test@example.com, current chat messages: 0
[Usage] Updated chat messages: 1
[Usage] ✓ Saved to file storage
[Usage] DATABASE disabled (no DATABASE_URL)
```

---

## 🎯 Next Steps

Once diagnostics shows everything working:

1. **File storage working?** ✅ → Quotas save and persist locally
2. **Neon tables created?** → Database syncs happen
3. **UI updates quotas?** ✅ → Everything is working!

If file storage works but Neon doesn't:
- That's fine! File storage is PRIMARY
- Neon is optional for distributed deployments
- App works perfectly with just file storage

