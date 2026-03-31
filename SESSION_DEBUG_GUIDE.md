# Session Tracking Debugging Guide

## Summary
Your database tables **DO EXIST** and are working. The issue is likely one of these:

1. **Authentication issue** - JWT token might not be available when `startSession` is called
2. **API not being called** - The session creation API might not be reached
3. **Silent error** - The API might be failing but errors aren't visible
4. **Metadata not being passed** - The request body might be malformed

## What Changed
I added **comprehensive logging** to help diagnose the problem:

### Client-Side (useSessionTracking.ts)
- ✓ Log when session creation starts
- ✓ Check if auth token is available (if NOT, user isn't authenticated)
- ✓ Log the full request body being sent
- ✓ Log response status and body
- ✓ Better error messages with full stack trace

### Server-Side (server.ts)
- ✓ Log when `/api/sessions/start` endpoint is called
- ✓ Log the authenticated user ID
- ✓ Log the request body
- ✓ Log the createSession function result
- ✓ Better error messages with details

## How to Test

1. **Open DevTools** in the Electron app:
   - Press `Ctrl+Shift+I` while the app is running
   - Go to "Console" tab

2. **Look for these logs** (in order):
   ```
   [Session] Starting session creation...
   [Session] ✓ Auth token obtained: ...
   [Session] Request body: { metadata: { ... } }
   [Session] Response status: 200
   [Session] Response data: { sessionId: "session_..." }
   [Session] ✓ Started session: session_...
   ```

3. **If you see errors instead**, they will show:
   ```
   [Session] ❌ No auth token available - user may not be authenticated
   [Session] ❌ Failed to start session: [ERROR DETAILS]
   ```

4. **Check server logs** in the terminal running `npm run electron:dev`:
   ```
   [API] POST /api/sessions/start called
   [API] User: user_XXXXX
   [API] Request body: { metadata: ... }
   [API] ✓ Session created successfully: session_...
   [Session] ✓ Created session: session_...
   ```

## Expected Behavior

**When you click the Mic button to start recording:**
1. Client calls `startSession()` with metadata (persona, resume, jd snippets)
2. Server receives request, authenticates user
3. Server calls `createSession(userId)` function
4. Database inserts new row into `sessions` table
5. Server returns `sessionId` to client
6. Client stores `sessionId` for later use (updates/close)

**When you ask a question during the session:**
- Client calls `updateSession()` with question data
- Server updates `sessions` table with question count

**When you stop recording:**
- Client calls `closeSession()`
- Server updates `sessions` table with `end_time` and `status='completed'`

## Next Steps

1. Start the app: `npm run electron:dev`
2. Sign in with Clerk
3. Click the mic button to start recording
4. **Check the DevTools Console for logs**
5. Share the console output here

## DB Schema Check

The sessions table exists with this structure:
```
id               UUID PRIMARY KEY
user_id          VARCHAR(255) REFERENCES users(user_id)
session_id       VARCHAR(255) UNIQUE
start_time       TIMESTAMP
end_time         TIMESTAMP (nullable)
questions_asked  INTEGER
voice_minutes_used INTEGER
status           VARCHAR(50) - 'active', 'completed', 'abandoned'
notes            TEXT
created_at       TIMESTAMP
```

## Common Issues & Solutions

### Issue: "No auth token available"
**Solution**: User is not authenticated with Clerk
- Make sure you signed in
- Check VITE_CLERK_PUBLISHABLE_KEY env var is set

### Issue: Response status 401
**Solution**: JWT token is not being sent correctly
- Check Authorization header format: `Bearer <token>`
- Verify token is valid

### Issue: Response status 500
**Solution**: Server error creating session
- Check server logs for "Error in POST /api/sessions/start"
- Likely database connection or permission issue

### Issue: No logs appear at all
**Solution**: `startSession()` function is not being called
- Verify mic button is actually clicked
- Check if `useSessionTracking` hook is properly imported
- Check if `startSession()` is being called in `toggleListen` callback

## Files That Changed

- `src/hooks/useSessionTracking.ts` - Added detailed logging
- `server.ts` - Added detailed logging to `/api/sessions/start` endpoint

---

**Current Status**: App is running with enhanced logging
**Next Action**: Click mic button and check console for logs
