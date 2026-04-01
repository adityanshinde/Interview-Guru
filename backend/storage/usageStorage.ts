import { UserRecord, SessionRecord } from '../../shared/types';
import { PlanTier, PLAN_LIMITS } from '../../shared/constants/planLimits';
import { executeDatabase, queryDatabase, queryDatabaseSingle } from '../services/database';

type SessionStoreRecord = SessionRecord & { userId: string };

function toNumber(value: unknown, fallback = 0): number {
  if (value === null || value === undefined) {
    return fallback;
  }

  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function getCurrentMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

function toDatabaseDate(value: number | Date | undefined | null): Date | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (value instanceof Date) {
    return value;
  }

  return new Date(value);
}

export interface TrialSecurityRecord {
  fingerprintHash: string;
  userId: string;
  email: string;
  ipHash: string;
  userAgentHash: string;
  blockedReason: string;
  createdAt: number;
  lastSeenAt: number;
  trialExpiresAt: number;
}

function rowToTrialSecurity(row: any): TrialSecurityRecord {
  return {
    fingerprintHash: row.fingerprint_hash,
    userId: row.user_id,
    email: row.email,
    ipHash: row.ip_hash,
    userAgentHash: row.user_agent_hash,
    blockedReason: row.blocked_reason ?? '',
    createdAt: toNumber(row.created_at),
    lastSeenAt: toNumber(row.last_seen_at),
    trialExpiresAt: toNumber(row.trial_expires_at),
  };
}

export async function getTrialSecurityByFingerprint(fingerprintHash: string): Promise<TrialSecurityRecord | null> {
  try {
    const query = `
      SELECT fingerprint_hash, user_id, email, ip_hash, user_agent_hash, blocked_reason, created_at, last_seen_at, trial_expires_at
      FROM trial_security
      WHERE fingerprint_hash = $1
      LIMIT 1;
    `;

    const row = await queryDatabaseSingle(query, [fingerprintHash]);
    return row ? rowToTrialSecurity(row) : null;
  } catch (error: any) {
    console.error('[TrialSecurity] Error fetching fingerprint:', error.message);
    return null;
  }
}

export async function registerTrialSecurityClaim(params: {
  fingerprintHash: string;
  userId: string;
  email: string;
  ipHash: string;
  userAgentHash: string;
  blockedReason?: string;
  trialExpiresAt: number;
}): Promise<void> {
  const existing = await getTrialSecurityByFingerprint(params.fingerprintHash);
  const now = new Date();

  if (existing) {
    if (existing.userId !== params.userId) {
      return;
    }

    await executeDatabase(
      `
        UPDATE trial_security
        SET email = $1,
            ip_hash = $2,
            user_agent_hash = $3,
            blocked_reason = $4,
            last_seen_at = $5,
            trial_expires_at = $6
        WHERE fingerprint_hash = $7 AND user_id = $8;
      `,
      [
        params.email,
        params.ipHash,
        params.userAgentHash,
        params.blockedReason || '',
        now,
        new Date(params.trialExpiresAt),
        params.fingerprintHash,
        params.userId,
      ]
    );
    return;
  }

  await executeDatabase(
    `
      INSERT INTO trial_security (
        fingerprint_hash, user_id, email, ip_hash, user_agent_hash,
        blocked_reason, created_at, last_seen_at, trial_expires_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9);
    `,
    [
      params.fingerprintHash,
      params.userId,
      params.email,
      params.ipHash,
      params.userAgentHash,
      params.blockedReason || '',
      now,
      now,
      new Date(params.trialExpiresAt),
    ]
  );
}

export async function touchTrialSecurityClaim(params: {
  fingerprintHash: string;
  userId: string;
  email: string;
}): Promise<void> {
  await executeDatabase(
    `
      UPDATE trial_security
      SET email = $1,
          last_seen_at = $2
      WHERE fingerprint_hash = $3 AND user_id = $4;
    `,
    [params.email, new Date(), params.fingerprintHash, params.userId]
  );
}

function rowToUser(row: any): UserRecord {
  return {
    userId: row.user_id,
    email: row.email,
    plan: row.plan,
    trialsUsed: Boolean(row.trial_used),
    trialStartDate: row.trial_start_date !== null && row.trial_start_date !== undefined
      ? toNumber(row.trial_start_date)
      : undefined,
    subscriptionStatus: row.subscription_status,
    currentMonth: row.current_month,
    voiceMinutesUsed: toNumber(row.voice_minutes_used),
    chatMessagesUsed: toNumber(row.chat_messages_used),
    sessionsUsed: toNumber(row.sessions_used),
    activeSessions: [],
    sessionHistory: [],
    createdAt: toNumber(row.created_at),
    lastActiveAt: toNumber(row.updated_at ?? row.last_active_at ?? row.created_at),
    stripeCustomerId: row.stripe_customer_id ?? undefined,
  };
}

function rowToSession(row: any): SessionStoreRecord {
  return {
    sessionId: row.session_id,
    userId: row.user_id,
    startTime: toNumber(row.start_time),
    endTime: row.end_time !== null && row.end_time !== undefined ? toNumber(row.end_time) : undefined,
    questionsAsked: toNumber(row.questions_asked),
    voiceMinutesUsed: toNumber(row.voice_minutes_used),
    status: row.status,
  };
}

function toPublicSession(session: SessionStoreRecord, email = ''): any {
  return {
    session_id: session.sessionId,
    user_id: session.userId,
    email,
    start_time: new Date(session.startTime).toISOString(),
    end_time: session.endTime ? new Date(session.endTime).toISOString() : null,
    questions_asked: session.questionsAsked,
    voice_minutes_used: session.voiceMinutesUsed,
    duration_seconds: Math.max(0, Math.floor((Date.now() - session.startTime) / 1000)),
    status: session.status,
  };
}

async function upsertUserRecord(user: UserRecord): Promise<void> {
  const query = `
    INSERT INTO users (
      user_id, email, plan, subscription_status, trial_used,
      trial_start_date, current_month, voice_minutes_used,
      chat_messages_used, sessions_used, stripe_customer_id,
      created_at, updated_at, last_active_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
    ON CONFLICT (user_id) DO UPDATE SET
      email = EXCLUDED.email,
      plan = EXCLUDED.plan,
      subscription_status = EXCLUDED.subscription_status,
      trial_used = EXCLUDED.trial_used,
      trial_start_date = EXCLUDED.trial_start_date,
      current_month = EXCLUDED.current_month,
      voice_minutes_used = EXCLUDED.voice_minutes_used,
      chat_messages_used = EXCLUDED.chat_messages_used,
      sessions_used = EXCLUDED.sessions_used,
      stripe_customer_id = EXCLUDED.stripe_customer_id,
      created_at = EXCLUDED.created_at,
      updated_at = EXCLUDED.updated_at,
      last_active_at = EXCLUDED.last_active_at;
  `;

  const now = Date.now();
  await executeDatabase(query, [
    user.userId,
    user.email,
    user.plan,
    user.subscriptionStatus,
    user.trialsUsed,
    toDatabaseDate(user.trialStartDate),
    user.currentMonth,
    user.voiceMinutesUsed,
    user.chatMessagesUsed,
    user.sessionsUsed,
    user.stripeCustomerId ?? null,
    toDatabaseDate(user.createdAt) ?? new Date(now),
    new Date(now),
    new Date(now),
  ]);
  user.lastActiveAt = now;
}

export async function getUserFromDB(userId: string): Promise<UserRecord | null> {
  try {
    const query = `
      SELECT
        user_id,
        email,
        plan,
        subscription_status,
        trial_used,
        trial_start_date,
        current_month,
        voice_minutes_used,
        chat_messages_used,
        sessions_used,
        stripe_customer_id,
        created_at,
        updated_at
      FROM users
      WHERE user_id = $1
      LIMIT 1;
    `;

    const row = await queryDatabaseSingle(query, [userId]);
    if (!row) {
      return null;
    }

    const user = rowToUser(row);
    if (resetMonthlyUsageIfNeeded(user)) {
      await upsertUserRecord(user);
    }

    console.log(`[DB] ✓ User loaded: ${userId.substring(0, 20)}...`);
    return user;
  } catch (error: any) {
    console.error('[DB] Error fetching user:', error.message);
    throw error;
  }
}

export async function createUserInDB(userId: string, email: string): Promise<UserRecord> {
  const now = Date.now();
  const user: UserRecord = {
    userId,
    email,
    plan: 'free',
    trialsUsed: false,
    trialStartDate: now,
    subscriptionStatus: 'trial',
    currentMonth: getCurrentMonth(),
    voiceMinutesUsed: 0,
    chatMessagesUsed: 0,
    sessionsUsed: 0,
    activeSessions: [],
    sessionHistory: [],
    createdAt: now,
    lastActiveAt: now,
  };

  try {
    await upsertUserRecord(user);
    console.log(`[DB] ✓ User created: ${userId.substring(0, 20)}...`);
    return user;
  } catch (error: any) {
    console.error('[DB] Error creating user:', error.message);
    throw error;
  }
}

export function resetMonthlyUsageIfNeeded(user: UserRecord): boolean {
  const currentMonth = getCurrentMonth();
  if (user.currentMonth !== currentMonth) {
    user.currentMonth = currentMonth;
    user.voiceMinutesUsed = 0;
    user.chatMessagesUsed = 0;
    user.sessionsUsed = 0;
    return true;
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
      VALUES ($1, $2, $3, $4);
    `;
    
    await executeDatabase(query, [
      userId,
      action,
      JSON.stringify(details),
      new Date()
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
    const sessionRecord: SessionStoreRecord = {
      userId,
      sessionId,
      startTime: Date.now(),
      questionsAsked: 0,
      voiceMinutesUsed: 0,
      status: 'active',
    };

    const query = `
      INSERT INTO sessions (session_id, user_id, start_time, end_time, questions_asked, voice_minutes_used, status, created_at)
      VALUES ($1, $2, $3, NULL, 0, 0, 'active', $4);
    `;
    
    await executeDatabase(query, [sessionId, userId, new Date(sessionRecord.startTime), new Date(sessionRecord.startTime)]);

    const user = await getUserFromDB(userId);
    if (user) {
      user.sessionsUsed += 1;
      user.lastActiveAt = Date.now();
      await upsertUserRecord(user);
    }

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
          end_time = $2
      WHERE session_id = $3;
    `;

    await executeDatabase(query, [status, new Date(), sessionId]);
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
        s.end_time,
        s.questions_asked,
        s.voice_minutes_used,
        s.status
      FROM sessions s
      JOIN users u ON s.user_id = u.user_id
      WHERE s.status = 'active'
      ORDER BY s.start_time DESC;
    `;
    
    const rows = await queryDatabase(query);
    const sessions = rows.map((row) => toPublicSession(rowToSession(row), row.email));
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
        s.session_id,
        s.user_id,
        u.email,
        s.start_time,
        s.end_time,
        s.questions_asked,
        s.voice_minutes_used,
        s.status
      FROM sessions s
      JOIN users u ON s.user_id = u.user_id
      WHERE s.user_id = $1
      ORDER BY start_time DESC
      LIMIT 50;
    `;
    
    const rows = await queryDatabase(query, [userId]);
    const sessions = rows.map((row) => toPublicSession(rowToSession(row), row.email));
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
    let user = await getUserFromDB(userId);
    if (!user) {
      user = await createUserInDB(userId, '');
    }

    const previousUsage = user.chatMessagesUsed;
    const monthChanged = resetMonthlyUsageIfNeeded(user);
    user.chatMessagesUsed += chatCount;
    user.lastActiveAt = Date.now();
    await upsertUserRecord(user);

    // Log to audit_logs (COMPLIANCE TRACKING)
    await logAuditEvent(userId, 'quota_update', {
      type: 'chat',
      before: previousUsage,
      after: user.chatMessagesUsed,
      increment: chatCount,
      monthReset: monthChanged
    });

    console.log(`[Usage] ✓ Chat usage recorded: ${user.chatMessagesUsed}/${PLAN_LIMITS[user.plan].chatMessagesPerMonth}`);
  } catch (error: any) {
    console.error('[Usage] ✗ Failed to record chat usage:', error.message);
  }
}

export async function recordVoiceUsage(userId: string, voiceMinutes: number): Promise<void> {
  console.log(`[Usage] recordVoiceUsage called for user: ${userId.substring(0, 20)}..., minutes: ${voiceMinutes}`);

  try {
    let user = await getUserFromDB(userId);
    if (!user) {
      user = await createUserInDB(userId, '');
    }

    const previousUsage = user.voiceMinutesUsed;
    const monthChanged = resetMonthlyUsageIfNeeded(user);
    user.voiceMinutesUsed += voiceMinutes;
    user.lastActiveAt = Date.now();
    await upsertUserRecord(user);

    // Log to audit_logs (COMPLIANCE TRACKING)
    await logAuditEvent(userId, 'quota_update', {
      type: 'voice',
      before: previousUsage,
      after: user.voiceMinutesUsed,
      increment: voiceMinutes,
      monthReset: monthChanged
    });

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
    default:
      return 0;
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
    let user = await getUserFromDB(userId);
    if (!user) {
      user = await createUserInDB(userId, '');
    }

    const oldPlan = user.plan;

    user.plan = newPlan;
    user.subscriptionStatus = 'active';
    user.voiceMinutesUsed = 0;
    user.chatMessagesUsed = 0;
    user.sessionsUsed = 0;
    user.lastActiveAt = Date.now();
    await upsertUserRecord(user);
    
    // Log plan upgrade to audit_logs
    await logAuditEvent(userId, 'plan_upgrade', {
      old_plan: oldPlan,
      new_plan: newPlan,
      quotas_reset: true
    });

    console.log(`[DB] ✓ User upgraded to plan: ${newPlan}`);
    return user;
  } catch (error: any) {
    console.error('[DB] Failed to upgrade user plan:', error.message);
    return null;
  }
}
