import { UserRecord, SessionRecord } from '../../src/lib/types.js';
import { PlanTier, PLAN_LIMITS } from '../../src/lib/planLimits.js';
import { queryDatabase, queryDatabaseSingle, executeDatabase } from './database.js';
import { getFromCache, setInCache, invalidateCache } from './cache.js';

/**
 * Usage Storage - Neon-First Architecture
 * 
 * Primary: Neon PostgreSQL (source of truth)
 * Cache: In-memory cache for fast reads (TTL: 5 minutes)
 * 
 * No file storage - all data persists in Neon
 */

export async function getUserFromDB(userId: string): Promise<UserRecord | null> {
  // Check cache first
  const cached = getFromCache(userId);
  if (cached) {
    console.log(`[DB] ✓ User loaded from cache: ${userId.substring(0, 20)}...`);
    return cached;
  }

  // Load from Neon
  try {
    const query = `
      SELECT 
        user_id, email, plan, subscription_status, current_month,
        voice_minutes_used, chat_messages_used, sessions_used,
        trials_used, trial_start_date, created_at, last_active_at
      FROM users
      WHERE user_id = $1
      LIMIT 1;
    `;
    const row = await queryDatabaseSingle(query, [userId]);

    if (row) {
      const user: UserRecord = {
        userId: row.user_id,
        email: row.email,
        plan: row.plan,
        trialsUsed: row.trials_used,
        trialStartDate: row.trial_start_date ? new Date(row.trial_start_date).getTime() : undefined,
        subscriptionStatus: row.subscription_status,
        currentMonth: row.current_month,
        voiceMinutesUsed: row.voice_minutes_used,
        chatMessagesUsed: row.chat_messages_used,
        sessionsUsed: row.sessions_used,
        activeSessions: [],
        sessionHistory: [],
        createdAt: new Date(row.created_at).getTime(),
        lastActiveAt: new Date(row.last_active_at).getTime(),
      };

      // Cache it for future reads
      setInCache(userId, user);
      console.log(`[DB] ✓ User loaded from Neon: ${userId.substring(0, 20)}...`);
      return user;
    }
  } catch (error: any) {
    console.error('[DB] Error fetching user:', error.message);
  }

  return null;
}

export async function createUserInDB(userId: string, email: string): Promise<UserRecord> {
  const now = Date.now();
  const currentMonth = new Date().toISOString().slice(0, 7);

  const user: UserRecord = {
    userId,
    email,
    plan: 'free',
    trialsUsed: false,
    trialStartDate: now,
    subscriptionStatus: 'trial',
    currentMonth,
    voiceMinutesUsed: 0,
    chatMessagesUsed: 0,
    sessionsUsed: 0,
    activeSessions: [],
    sessionHistory: [],
    createdAt: now,
    lastActiveAt: now,
  };

  try {
    const query = `
      INSERT INTO users 
      (user_id, email, plan, subscription_status, current_month, 
       voice_minutes_used, chat_messages_used, sessions_used,
       trial_start_date, trials_used, created_at, last_active_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12);
    `;
    
    const params = [
      user.userId,
      user.email,
      user.plan,
      user.subscriptionStatus,
      user.currentMonth,
      user.voiceMinutesUsed,
      user.chatMessagesUsed,
      user.sessionsUsed,
      new Date(user.trialStartDate || now),
      user.trialsUsed,
      new Date(user.createdAt),
      new Date(user.lastActiveAt),
    ];
    
    await executeDatabase(query, params);

    setInCache(userId, user);
    console.log(`[DB] ✓ User created: ${userId.substring(0, 20)}...`);
    return user;
  } catch (error: any) {
    console.error('[DB] Error creating user:', error.message);
    throw error;
  }
}

export function resetMonthlyUsageIfNeeded(user: UserRecord): boolean {
  const currentMonth = new Date().toISOString().slice(0, 7);
  if (user.currentMonth !== currentMonth) {
    user.currentMonth = currentMonth;
    user.voiceMinutesUsed = 0;
    user.chatMessagesUsed = 0;
    user.sessionsUsed = 0;
    return true; // Changed
  }
  return false;
}

/**
 * Log an action to audit_logs table for compliance tracking
 */
async function logAuditEvent(
  userId: string,
  action: string,
  details: Record<string, any>
): Promise<void> {
  try {
    const query = `
      INSERT INTO audit_logs (user_id, action, details, created_at)
      VALUES ($1, $2, $3, CURRENT_TIMESTAMP);
    `;
    
    await executeDatabase(query, [
      userId,
      action,
      JSON.stringify(details)
    ]);
    
    console.log(`[Audit] ✓ Logged: ${action} for user ${userId.substring(0, 20)}...`);
  } catch (error: any) {
    console.error(`[Audit] ✗ Failed to log ${action}:`, error.message);
  }
}

/**
 * Create a new interview session when user starts interviewing
 */
export async function createSession(userId: string): Promise<string | null> {
  try {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    
    const query = `
      INSERT INTO sessions (user_id, session_id, start_time, status)
      VALUES ($1, $2, CURRENT_TIMESTAMP, 'active');
    `;
    
    await executeDatabase(query, [userId, sessionId]);
    console.log(`[Session] ✓ Created session: ${sessionId}`);
    return sessionId;
  } catch (error: any) {
    console.error(`[Session] ✗ Failed to create session:`, error.message);
    return null;
  }
}

/**
 * Update session with question count and voice minutes used
 */
export async function updateSession(
  sessionId: string,
  questionsAsked: number,
  voiceMinutesUsed: number = 0
): Promise<void> {
  try {
    const query = `
      UPDATE sessions 
      SET questions_asked = $1,
          voice_minutes_used = $2
      WHERE session_id = $3;
    `;
    
    await executeDatabase(query, [questionsAsked, voiceMinutesUsed, sessionId]);
    console.log(`[Session] ✓ Updated: ${questionsAsked} questions, ${voiceMinutesUsed}m voice`);
  } catch (error: any) {
    console.error(`[Session] ✗ Failed to update session:`, error.message);
  }
}

/**
 * Close/complete an interview session
 */
export async function closeSession(
  sessionId: string,
  status: 'completed' | 'abandoned'
): Promise<void> {
  try {
    const query = `
      UPDATE sessions 
      SET status = $1,
          end_time = CURRENT_TIMESTAMP
      WHERE session_id = $2;
    `;
    
    await executeDatabase(query, [status, sessionId]);
    console.log(`[Session] ✓ Closed session: status=${status}`);
  } catch (error: any) {
    console.error(`[Session] ✗ Failed to close session:`, error.message);
  }
}

/**
 * Get all active sessions (for monitoring dashboard)
 */
export async function getActiveSessions(): Promise<any[]> {
  try {
    const query = `
      SELECT
        s.session_id,
        s.user_id,
        u.email,
        s.start_time,
        s.questions_asked,
        s.voice_minutes_used,
        EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - s.start_time)) as duration_seconds
      FROM sessions s
      JOIN users u ON s.user_id = u.user_id
      WHERE s.status = 'active'
      ORDER BY s.start_time DESC;
    `;
    
    const sessions = await queryDatabase(query);
    console.log(`[Session] ✓ Found ${sessions.length} active sessions`);
    return sessions;
  } catch (error: any) {
    console.error(`[Session] ✗ Failed to get active sessions:`, error.message);
    return [];
  }
}

/**
 * Get session history for a user (for analytics/compliance)
 */
export async function getUserSessionHistory(userId: string): Promise<any[]> {
  try {
    const query = `
      SELECT
        session_id,
        start_time,
        end_time,
        questions_asked,
        voice_minutes_used,
        status
      FROM sessions
      WHERE user_id = $1
      ORDER BY start_time DESC
      LIMIT 50;
    `;
    
    const sessions = await queryDatabase(query, [userId]);
    console.log(`[Session] ✓ Found ${sessions.length} past sessions for user`);
    return sessions;
  } catch (error: any) {
    console.error(`[Session] ✗ Failed to get session history:`, error.message);
    return [];
  }
}

export async function recordChatUsage(userId: string, chatCount: number = 1): Promise<void> {
  console.log(`[Usage] recordChatUsage called for user: ${userId.substring(0, 20)}..., count: ${chatCount}`);

  try {
    // Get user from DB or cache
    let user = await getUserFromDB(userId);
    if (!user) {
      console.error(`[Usage] ✗ User not found: ${userId}`);
      return;
    }

    // Track previous value for audit log
    const previousUsage = user.chatMessagesUsed;

    // Check if monthly reset needed
    const monthChanged = resetMonthlyUsageIfNeeded(user);
    
    // Update in-memory user
    user.chatMessagesUsed += chatCount;
    user.lastActiveAt = Date.now();

    // Update database
    const currentMonth = user.currentMonth;
    const query = `
      UPDATE users 
      SET chat_messages_used = $1,
          last_active_at = TO_TIMESTAMP($2 / 1000.0),
          current_month = $3,
          ${monthChanged ? 'voice_minutes_used = 0, sessions_used = 0,' : ''}
          updated_at = CURRENT_TIMESTAMP
      WHERE user_id = $4;
    `;
    
    await executeDatabase(query, [
      user.chatMessagesUsed,
      user.lastActiveAt,
      currentMonth,
      userId
    ]);

    // Log to audit_logs (COMPLIANCE TRACKING)
    await logAuditEvent(userId, 'quota_update', {
      type: 'chat',
      before: previousUsage,
      after: user.chatMessagesUsed,
      increment: chatCount,
      monthReset: monthChanged
    });

    // Update cache
    setInCache(userId, user);
    console.log(`[Usage] ✓ Chat usage recorded: ${user.chatMessagesUsed}/${PLAN_LIMITS[user.plan].chatMessagesPerMonth}`);
  } catch (error: any) {
    console.error('[Usage] ✗ Failed to record chat usage:', error.message);
  }
}

export async function recordVoiceUsage(userId: string, voiceMinutes: number): Promise<void> {
  console.log(`[Usage] recordVoiceUsage called for user: ${userId.substring(0, 20)}..., minutes: ${voiceMinutes}`);

  try {
    // Get user from DB or cache
    let user = await getUserFromDB(userId);
    if (!user) {
      console.error(`[Usage] ✗ User not found: ${userId}`);
      return;
    }

    // Track previous value for audit log
    const previousUsage = user.voiceMinutesUsed;

    // Check if monthly reset needed
    const monthChanged = resetMonthlyUsageIfNeeded(user);
    
    // Update in-memory user
    user.voiceMinutesUsed += voiceMinutes;
    user.lastActiveAt = Date.now();

    // Update database
    const currentMonth = user.currentMonth;
    const query = `
      UPDATE users 
      SET voice_minutes_used = $1,
          last_active_at = TO_TIMESTAMP($2 / 1000.0),
          current_month = $3,
          ${monthChanged ? 'chat_messages_used = 0, sessions_used = 0,' : ''}
          updated_at = CURRENT_TIMESTAMP
      WHERE user_id = $4;
    `;
    
    await executeDatabase(query, [
      user.voiceMinutesUsed,
      user.lastActiveAt,
      currentMonth,
      userId
    ]);

    // Log to audit_logs (COMPLIANCE TRACKING)
    await logAuditEvent(userId, 'quota_update', {
      type: 'voice',
      before: previousUsage,
      after: user.voiceMinutesUsed,
      increment: voiceMinutes,
      monthReset: monthChanged
    });

    // Update cache
    setInCache(userId, user);
    console.log(`[Usage] ✓ Voice usage recorded: ${user.voiceMinutesUsed}/${PLAN_LIMITS[user.plan].voiceMinutesPerMonth} minutes`);
  } catch (error: any) {
    console.error('[Usage] ✗ Failed to record voice usage:', error.message);
  }
}
export async function getRemainingQuota(
  userId: string,
  quotaType: 'voice' | 'chat' | 'session'
): Promise<number> {
  const user = await getUserFromDB(userId);
  if (!user) return 0;

  resetMonthlyUsageIfNeeded(user);
  const planConfig = PLAN_LIMITS[user.plan];

  switch (quotaType) {
    case 'voice':
      return Math.max(0, planConfig.voiceMinutesPerMonth - user.voiceMinutesUsed);
    case 'chat':
      return Math.max(0, planConfig.chatMessagesPerMonth - user.chatMessagesUsed);
    case 'session':
      return Math.max(0, planConfig.sessionsPerMonth - user.sessionsUsed);
  }
}

export function checkTrialExpired(user: UserRecord): boolean {
  if (!user.trialStartDate || user.plan !== 'free') {
    return false;
  }

  const trialDays = PLAN_LIMITS.free.trialDays || 7;
  const trialEndTime = user.trialStartDate + trialDays * 24 * 60 * 60 * 1000;
  return Date.now() > trialEndTime;
}

export function calculateTrialDaysRemaining(user: UserRecord): number {
  if (!user.trialStartDate || user.plan !== 'free') {
    return 0;
  }

  const trialDays = PLAN_LIMITS.free.trialDays || 7;
  const trialEndTime = user.trialStartDate + trialDays * 24 * 60 * 60 * 1000;
  const daysRemaining = Math.ceil((trialEndTime - Date.now()) / (24 * 60 * 60 * 1000));
  return Math.max(0, daysRemaining);
}

export async function upgradeUserPlan(userId: string, newPlan: PlanTier): Promise<UserRecord | null> {
  try {
    const user = await getUserFromDB(userId);
    if (!user) return null;

    const oldPlan = user.plan;

    user.plan = newPlan;
    user.subscriptionStatus = 'active';
    user.voiceMinutesUsed = 0;
    user.chatMessagesUsed = 0;
    user.sessionsUsed = 0;
    user.lastActiveAt = Date.now();

    const query = `
      UPDATE users 
      SET plan = $1, 
          subscription_status = 'active',
          voice_minutes_used = 0,
          chat_messages_used = 0,
          sessions_used = 0,
          last_active_at = TO_TIMESTAMP($2 / 1000.0),
          updated_at = CURRENT_TIMESTAMP
      WHERE user_id = $3;
    `;
    
    await executeDatabase(query, [newPlan, Date.now(), userId]);
    
    // Log plan upgrade to audit_logs
    await logAuditEvent(userId, 'plan_upgrade', {
      old_plan: oldPlan,
      new_plan: newPlan,
      quotas_reset: true
    });

    // Update cache
    setInCache(userId, user);
    console.log(`[DB] ✓ User upgraded to plan: ${newPlan}`);
    return user;
  } catch (error: any) {
    console.error('[DB] Failed to upgrade user plan:', error.message);
    return null;
  }
}
