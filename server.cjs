var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/lib/planLimits.ts
var PLAN_LIMITS;
var init_planLimits = __esm({
  "src/lib/planLimits.ts"() {
    PLAN_LIMITS = {
      free: {
        name: "Free Trial",
        price: 0,
        currency: "USD",
        billingPeriod: "one-time",
        trialDays: 7,
        voiceMinutesPerMonth: 10,
        chatMessagesPerMonth: 1e3,
        sessionsPerMonth: 1,
        features: {
          textToSpeech: false,
          sessionExport: false,
          customPersonas: false,
          cacheGeneration: false,
          advancedAnalytics: false
        },
        notes: "7-day free trial, then upgrade required"
      },
      basic: {
        name: "Basic",
        price: 9.99,
        currency: "USD",
        billingPeriod: "month",
        voiceMinutesPerMonth: 60,
        chatMessagesPerMonth: 500,
        sessionsPerMonth: 1,
        features: {
          textToSpeech: true,
          sessionExport: false,
          customPersonas: false,
          cacheGeneration: true,
          advancedAnalytics: false
        },
        notes: "Essential for regular interview prep"
      },
      pro: {
        name: "Professional",
        price: 29.99,
        currency: "USD",
        billingPeriod: "month",
        voiceMinutesPerMonth: 600,
        chatMessagesPerMonth: 5e3,
        sessionsPerMonth: 10,
        features: {
          textToSpeech: true,
          sessionExport: true,
          customPersonas: true,
          cacheGeneration: true,
          advancedAnalytics: true
        },
        notes: "For power users prepping for multiple interviews"
      },
      enterprise: {
        name: "Enterprise",
        price: null,
        currency: "USD",
        billingPeriod: "year",
        voiceMinutesPerMonth: 99999,
        chatMessagesPerMonth: 99999,
        sessionsPerMonth: 99999,
        features: {
          textToSpeech: true,
          sessionExport: true,
          customPersonas: true,
          cacheGeneration: true,
          advancedAnalytics: true
        },
        notes: "Custom terms, dedicated support"
      }
    };
  }
});

// server/lib/database.ts
function initializeDatabase() {
  if (pool) {
    return pool;
  }
  const DATABASE_URL = process.env.DATABASE_URL;
  if (!DATABASE_URL) {
    console.warn("[DB] \u26A0\uFE0F  DATABASE_URL not set - database features disabled");
    isConnected = false;
    return new import_pg.Pool({ connectionString: "" });
  }
  pool = new import_pg.Pool({
    connectionString: DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    },
    max: 10,
    // Increase from 1 to 10 for better concurrency
    min: 2,
    // Keep 2 connections open
    idleTimeoutMillis: 3e4,
    // 30 seconds (was 10s, too aggressive)
    connectionTimeoutMillis: 1e4,
    // 10 seconds (increased from 5s)
    statement_timeout: 3e4,
    // 30 second statement timeout
    query_timeout: 3e4
  });
  pool.query("SELECT NOW()", (err, res) => {
    if (err) {
      console.error("[DB] \u274C Initial connection test failed:", err.message);
      isConnected = false;
      return;
    }
    console.log("[DB] \u2705 Connected to Neon PostgreSQL");
    isConnected = true;
  });
  pool.on("error", (err) => {
    console.error("[DB] \u274C Unexpected pool error:", err.message);
    isConnected = false;
  });
  return pool;
}
async function queryDatabase(query, params = []) {
  try {
    if (!pool) {
      pool = initializeDatabase();
    }
    const result = await pool.query(query, params);
    return result.rows;
  } catch (error) {
    console.error("[DB] Query failed:", error.message);
    console.error("[DB] Query:", query);
    throw error;
  }
}
async function queryDatabaseSingle(query, params = []) {
  const rows = await queryDatabase(query, params);
  return rows[0] || null;
}
async function executeDatabase(query, params = []) {
  await queryDatabase(query, params);
}
var import_pg, pool, isConnected;
var init_database = __esm({
  "server/lib/database.ts"() {
    import_pg = require("pg");
    pool = null;
    isConnected = false;
  }
});

// server/lib/cache.ts
function getFromCache(userId) {
  const cached = userCache.get(userId);
  if (!cached) return null;
  const lastSync = lastSyncTime.get(userId) || 0;
  const isStale = Date.now() - lastSync > CACHE_TTL;
  if (isStale) {
    console.log(`[Cache] TTL expired for user ${userId.substring(0, 20)}... (${Math.round((Date.now() - lastSync) / 1e3)}s old)`);
    return null;
  }
  return cached;
}
function setInCache(userId, user) {
  userCache.set(userId, { ...user });
  lastSyncTime.set(userId, Date.now());
  console.log(`[Cache] \u2713 Cached user ${userId.substring(0, 20)}...`);
}
var userCache, lastSyncTime, CACHE_TTL;
var init_cache = __esm({
  "server/lib/cache.ts"() {
    userCache = /* @__PURE__ */ new Map();
    lastSyncTime = /* @__PURE__ */ new Map();
    CACHE_TTL = 5 * 60 * 1e3;
  }
});

// server/lib/usageStorage.ts
var usageStorage_exports = {};
__export(usageStorage_exports, {
  calculateTrialDaysRemaining: () => calculateTrialDaysRemaining,
  checkTrialExpired: () => checkTrialExpired,
  closeSession: () => closeSession,
  createSession: () => createSession,
  createUserInDB: () => createUserInDB,
  getActiveSessions: () => getActiveSessions,
  getRemainingQuota: () => getRemainingQuota,
  getUserFromDB: () => getUserFromDB,
  getUserSessionHistory: () => getUserSessionHistory,
  recordChatUsage: () => recordChatUsage,
  recordVoiceUsage: () => recordVoiceUsage,
  resetMonthlyUsageIfNeeded: () => resetMonthlyUsageIfNeeded,
  updateSession: () => updateSession,
  upgradeUserPlan: () => upgradeUserPlan
});
async function getUserFromDB(userId) {
  const cached = getFromCache(userId);
  if (cached) {
    console.log(`[DB] \u2713 User loaded from cache: ${userId.substring(0, 20)}...`);
    return cached;
  }
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
      const user = {
        userId: row.user_id,
        email: row.email,
        plan: row.plan,
        trialsUsed: row.trials_used,
        trialStartDate: row.trial_start_date ? new Date(row.trial_start_date).getTime() : void 0,
        subscriptionStatus: row.subscription_status,
        currentMonth: row.current_month,
        voiceMinutesUsed: row.voice_minutes_used,
        chatMessagesUsed: row.chat_messages_used,
        sessionsUsed: row.sessions_used,
        activeSessions: [],
        sessionHistory: [],
        createdAt: new Date(row.created_at).getTime(),
        lastActiveAt: new Date(row.last_active_at).getTime()
      };
      setInCache(userId, user);
      console.log(`[DB] \u2713 User loaded from Neon: ${userId.substring(0, 20)}...`);
      return user;
    }
  } catch (error) {
    console.error("[DB] Error fetching user:", error.message);
  }
  return null;
}
async function createUserInDB(userId, email) {
  console.log(`[DB] createUserInDB called with userId: ${userId}, email: ${email}`);
  const now = Date.now();
  const currentMonth = (/* @__PURE__ */ new Date()).toISOString().slice(0, 7);
  const user = {
    userId,
    email,
    plan: "free",
    trialsUsed: false,
    trialStartDate: now,
    subscriptionStatus: "trial",
    currentMonth,
    voiceMinutesUsed: 0,
    chatMessagesUsed: 0,
    sessionsUsed: 0,
    activeSessions: [],
    sessionHistory: [],
    createdAt: now,
    lastActiveAt: now
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
      new Date(user.lastActiveAt)
    ];
    console.log(`[DB] Executing INSERT with query: ${query.substring(0, 100)}...`);
    console.log(`[DB] Parameters: user_id=${params[0]}, email=${params[1]}, plan=${params[2]}`);
    const result = await executeDatabase(query, params);
    console.log(`[DB] INSERT execute returned: ${JSON.stringify(result)}`);
    setInCache(userId, user);
    console.log(`[DB] \u2713 New user created and cached: ${userId.substring(0, 20)}...`);
    return user;
  } catch (error) {
    console.error("[DB] \u274C Error creating user:", error.message);
    console.error("[DB] Stack trace:", error.stack);
    throw error;
  }
}
function resetMonthlyUsageIfNeeded(user) {
  const currentMonth = (/* @__PURE__ */ new Date()).toISOString().slice(0, 7);
  if (user.currentMonth !== currentMonth) {
    user.currentMonth = currentMonth;
    user.voiceMinutesUsed = 0;
    user.chatMessagesUsed = 0;
    user.sessionsUsed = 0;
    return true;
  }
  return false;
}
async function logAuditEvent(userId, action, details) {
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
    console.log(`[Audit] \u2713 Logged: ${action} for user ${userId.substring(0, 20)}...`);
  } catch (error) {
    console.error(`[Audit] \u2717 Failed to log ${action}:`, error.message);
  }
}
async function createSession(userId) {
  try {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const query = `
      INSERT INTO sessions (user_id, session_id, start_time, status)
      VALUES ($1, $2, CURRENT_TIMESTAMP, 'active');
    `;
    await executeDatabase(query, [userId, sessionId]);
    console.log(`[Session] \u2713 Created session: ${sessionId}`);
    return sessionId;
  } catch (error) {
    console.error(`[Session] \u2717 Failed to create session:`, error.message);
    return null;
  }
}
async function updateSession(sessionId, questionsAsked, voiceMinutesUsed = 0) {
  try {
    const query = `
      UPDATE sessions 
      SET questions_asked = $1,
          voice_minutes_used = $2
      WHERE session_id = $3;
    `;
    await executeDatabase(query, [questionsAsked, voiceMinutesUsed, sessionId]);
    console.log(`[Session] \u2713 Updated: ${questionsAsked} questions, ${voiceMinutesUsed}m voice`);
  } catch (error) {
    console.error(`[Session] \u2717 Failed to update session:`, error.message);
  }
}
async function closeSession(sessionId, status) {
  try {
    const query = `
      UPDATE sessions 
      SET status = $1,
          end_time = CURRENT_TIMESTAMP
      WHERE session_id = $2;
    `;
    await executeDatabase(query, [status, sessionId]);
    console.log(`[Session] \u2713 Closed session: status=${status}`);
  } catch (error) {
    console.error(`[Session] \u2717 Failed to close session:`, error.message);
  }
}
async function getActiveSessions() {
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
    console.log(`[Session] \u2713 Found ${sessions.length} active sessions`);
    return sessions;
  } catch (error) {
    console.error(`[Session] \u2717 Failed to get active sessions:`, error.message);
    return [];
  }
}
async function getUserSessionHistory(userId) {
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
    console.log(`[Session] \u2713 Found ${sessions.length} past sessions for user`);
    return sessions;
  } catch (error) {
    console.error(`[Session] \u2717 Failed to get session history:`, error.message);
    return [];
  }
}
async function recordChatUsage(userId, chatCount = 1) {
  console.log(`[Usage] recordChatUsage called for user: ${userId.substring(0, 20)}..., count: ${chatCount}`);
  try {
    let user = await getUserFromDB(userId);
    if (!user) {
      console.error(`[Usage] \u2717 User not found: ${userId}`);
      return;
    }
    const previousUsage = user.chatMessagesUsed;
    const monthChanged = resetMonthlyUsageIfNeeded(user);
    user.chatMessagesUsed += chatCount;
    user.lastActiveAt = Date.now();
    const currentMonth = user.currentMonth;
    const query = `
      UPDATE users 
      SET chat_messages_used = $1,
          last_active_at = TO_TIMESTAMP($2 / 1000.0),
          current_month = $3,
          ${monthChanged ? "voice_minutes_used = 0, sessions_used = 0," : ""}
          updated_at = CURRENT_TIMESTAMP
      WHERE user_id = $4;
    `;
    await executeDatabase(query, [
      user.chatMessagesUsed,
      user.lastActiveAt,
      currentMonth,
      userId
    ]);
    await logAuditEvent(userId, "quota_update", {
      type: "chat",
      before: previousUsage,
      after: user.chatMessagesUsed,
      increment: chatCount,
      monthReset: monthChanged
    });
    setInCache(userId, user);
    console.log(`[Usage] \u2713 Chat usage recorded: ${user.chatMessagesUsed}/${PLAN_LIMITS[user.plan].chatMessagesPerMonth}`);
  } catch (error) {
    console.error("[Usage] \u2717 Failed to record chat usage:", error.message);
  }
}
async function recordVoiceUsage(userId, voiceMinutes) {
  console.log(`[Usage] recordVoiceUsage called for user: ${userId.substring(0, 20)}..., minutes: ${voiceMinutes}`);
  try {
    let user = await getUserFromDB(userId);
    if (!user) {
      console.error(`[Usage] \u2717 User not found: ${userId}`);
      return;
    }
    const previousUsage = user.voiceMinutesUsed;
    const monthChanged = resetMonthlyUsageIfNeeded(user);
    user.voiceMinutesUsed += voiceMinutes;
    user.lastActiveAt = Date.now();
    const currentMonth = user.currentMonth;
    const query = `
      UPDATE users 
      SET voice_minutes_used = $1,
          last_active_at = TO_TIMESTAMP($2 / 1000.0),
          current_month = $3,
          ${monthChanged ? "chat_messages_used = 0, sessions_used = 0," : ""}
          updated_at = CURRENT_TIMESTAMP
      WHERE user_id = $4;
    `;
    await executeDatabase(query, [
      user.voiceMinutesUsed,
      user.lastActiveAt,
      currentMonth,
      userId
    ]);
    await logAuditEvent(userId, "quota_update", {
      type: "voice",
      before: previousUsage,
      after: user.voiceMinutesUsed,
      increment: voiceMinutes,
      monthReset: monthChanged
    });
    setInCache(userId, user);
    console.log(`[Usage] \u2713 Voice usage recorded: ${user.voiceMinutesUsed}/${PLAN_LIMITS[user.plan].voiceMinutesPerMonth} minutes`);
  } catch (error) {
    console.error("[Usage] \u2717 Failed to record voice usage:", error.message);
  }
}
async function getRemainingQuota(userId, quotaType) {
  const user = await getUserFromDB(userId);
  if (!user) return 0;
  resetMonthlyUsageIfNeeded(user);
  const planConfig = PLAN_LIMITS[user.plan];
  switch (quotaType) {
    case "voice":
      return Math.max(0, planConfig.voiceMinutesPerMonth - user.voiceMinutesUsed);
    case "chat":
      return Math.max(0, planConfig.chatMessagesPerMonth - user.chatMessagesUsed);
    case "session":
      return Math.max(0, planConfig.sessionsPerMonth - user.sessionsUsed);
  }
}
function checkTrialExpired(user) {
  if (!user.trialStartDate || user.plan !== "free") {
    return false;
  }
  const trialDays = PLAN_LIMITS.free.trialDays || 7;
  const trialEndTime = user.trialStartDate + trialDays * 24 * 60 * 60 * 1e3;
  return Date.now() > trialEndTime;
}
function calculateTrialDaysRemaining(user) {
  if (!user.trialStartDate || user.plan !== "free") {
    return 0;
  }
  const trialDays = PLAN_LIMITS.free.trialDays || 7;
  const trialEndTime = user.trialStartDate + trialDays * 24 * 60 * 60 * 1e3;
  const daysRemaining = Math.ceil((trialEndTime - Date.now()) / (24 * 60 * 60 * 1e3));
  return Math.max(0, daysRemaining);
}
async function upgradeUserPlan(userId, newPlan) {
  try {
    const user = await getUserFromDB(userId);
    if (!user) return null;
    const oldPlan = user.plan;
    user.plan = newPlan;
    user.subscriptionStatus = "active";
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
    await logAuditEvent(userId, "plan_upgrade", {
      old_plan: oldPlan,
      new_plan: newPlan,
      quotas_reset: true
    });
    setInCache(userId, user);
    console.log(`[DB] \u2713 User upgraded to plan: ${newPlan}`);
    return user;
  } catch (error) {
    console.error("[DB] Failed to upgrade user plan:", error.message);
    return null;
  }
}
var init_usageStorage = __esm({
  "server/lib/usageStorage.ts"() {
    init_planLimits();
    init_database();
    init_cache();
  }
});

// server.ts
var server_exports = {};
__export(server_exports, {
  startServer: () => startServer
});
module.exports = __toCommonJS(server_exports);
var import_express = __toESM(require("express"), 1);
var import_http = require("http");
var import_dotenv = __toESM(require("dotenv"), 1);
var import_groq_sdk = __toESM(require("groq-sdk"), 1);
var import_fs = __toESM(require("fs"), 1);
var import_path = __toESM(require("path"), 1);
var import_os = __toESM(require("os"), 1);
var import_transformers = require("@xenova/transformers");

// server/middleware/authMiddleware.ts
var import_jsonwebtoken = __toESM(require("jsonwebtoken"), 1);
init_planLimits();
init_usageStorage();
var authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({ error: "Missing or invalid authorization header" });
      return;
    }
    const token = authHeader.substring(7);
    const decoded = import_jsonwebtoken.default.decode(token);
    if (!decoded || !decoded.sub) {
      res.status(401).json({ error: "Invalid token" });
      return;
    }
    const clerkUserId = decoded.sub;
    console.log(`[Auth] Clerk user ID: ${clerkUserId}, email: ${decoded.email}`);
    console.log(`[Auth] Loading user from DB: ${clerkUserId}`);
    let userRecord = await getUserFromDB(clerkUserId);
    console.log(`[Auth] getUserFromDB result: ${userRecord ? "FOUND" : "NOT FOUND"}`);
    if (!userRecord) {
      console.log(`[Auth] \u26A0\uFE0F  First-time user, creating record...`);
      try {
        userRecord = await createUserInDB(clerkUserId, decoded.email || "");
        console.log(`[Auth] \u2713 User record created: plan=${userRecord.plan}, id=${userRecord.userId.substring(0, 20)}...`);
      } catch (createErr) {
        console.error(`[Auth] \u274C Failed to create user: ${createErr.message}`);
        throw createErr;
      }
    } else {
      console.log(`[Auth] \u2713 Existing user found: email=${userRecord.email || "(no email)"}, plan=${userRecord.plan}`);
      if (userRecord.plan === "free" && checkTrialExpired(userRecord)) {
        console.log(`[Auth] \u2717 Trial expired for user: ${userRecord.email}`);
        res.status(402).json({
          error: "Free trial expired",
          action: "upgrade",
          message: "Your 7-day trial has ended. Please upgrade to continue."
        });
        return;
      }
    }
    req.user = {
      userId: clerkUserId,
      email: userRecord.email,
      plan: userRecord.plan
    };
    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    res.status(500).json({ error: "Authentication failed" });
  }
};
function quotaMiddleware(quotaType) {
  return async (req, res, next) => {
    const authReq = req;
    if (!authReq.user) {
      res.status(401).json({ error: "User not authenticated" });
      return;
    }
    const user = await getUserFromDB(authReq.user.userId);
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    const shouldReset = resetMonthlyUsageIfNeeded(user);
    if (shouldReset) {
      console.log(`[Quota] Monthly usage reset for user ${authReq.user.userId}`);
    }
    const planConfig = PLAN_LIMITS[user.plan];
    switch (quotaType) {
      case "voice":
        if (user.voiceMinutesUsed >= planConfig.voiceMinutesPerMonth) {
          res.status(402).json({
            error: "Voice quota exceeded",
            quotaUsed: user.voiceMinutesUsed,
            quotaLimit: planConfig.voiceMinutesPerMonth,
            message: `Monthly voice limit (${planConfig.voiceMinutesPerMonth}m) reached`
          });
          return;
        }
        break;
      case "chat":
        if (user.chatMessagesUsed >= planConfig.chatMessagesPerMonth) {
          res.status(402).json({
            error: "Chat quota exceeded",
            quotaUsed: user.chatMessagesUsed,
            quotaLimit: planConfig.chatMessagesPerMonth,
            message: `Monthly chat limit (${planConfig.chatMessagesPerMonth}) reached`
          });
          return;
        }
        break;
      case "session":
        if (user.sessionsUsed >= planConfig.sessionsPerMonth) {
          res.status(402).json({
            error: "Session quota exceeded",
            quotaUsed: user.sessionsUsed,
            quotaLimit: planConfig.sessionsPerMonth,
            message: `Monthly session limit (${planConfig.sessionsPerMonth}) reached`
          });
          return;
        }
        break;
    }
    next();
  };
}

// server.ts
init_usageStorage();
init_planLimits();
init_database();
import_transformers.env.allowLocalModels = false;
var vectorCache = [];
var CACHE_FILE = import_path.default.join(import_os.default.tmpdir(), "interviewguru_cache.json");
try {
  if (import_fs.default.existsSync(CACHE_FILE)) {
    vectorCache = JSON.parse(import_fs.default.readFileSync(CACHE_FILE, "utf-8"));
    console.log(`Loaded ${vectorCache.length} cached answers from disk.`);
  }
} catch (e) {
  console.log("No cache found or malformed.");
}
var extractor = null;
async function getEmbedding(text) {
  if (!extractor) {
    extractor = await (0, import_transformers.pipeline)("feature-extraction", "Xenova/all-MiniLM-L6-v2");
  }
  const output = await extractor(text, { pooling: "mean", normalize: true });
  return Array.from(output.data);
}
function cosineSimilarity(a, b) {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}
function extractJSON(content) {
  if (!content) return {};
  try {
    const match = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (match) return JSON.parse(match[1]);
    return JSON.parse(content);
  } catch {
    return {};
  }
}
import_dotenv.default.config();
console.log("[Server] Initializing database pool...");
var dbPool = initializeDatabase();
console.log("[Server] Database pool initialized");
async function startServer() {
  const app = (0, import_express.default)();
  let initialPort = process.env.PORT ? parseInt(process.env.PORT) : 3e3;
  const httpServer = (0, import_http.createServer)(app);
  app.use(import_express.default.json({ limit: "50mb" }));
  app.use("/api", authMiddleware);
  function getGroq(customKey) {
    const key = customKey || process.env.GROQ_API_KEY;
    if (!key) {
      const err = new Error("API key is required. Please provide it in settings or set GROQ_API_KEY environment variable in your .env file.");
      err.status = 401;
      throw err;
    }
    return new import_groq_sdk.default({ apiKey: key });
  }
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });
  app.post("/api/transcribe", quotaMiddleware("voice"), async (req, res) => {
    let tmpFilePath = "";
    try {
      const authReq = req;
      const customKey = req.headers["x-api-key"] || "";
      const customVoiceModel = req.headers["x-voice-model"] || "whisper-large-v3-turbo";
      const groq = getGroq(customKey);
      const { audioBase64, mimeType, audioChunkDuration } = req.body;
      if (!audioBase64) {
        return res.status(400).json({ error: "No audio provided" });
      }
      const ext = mimeType?.includes("mp4") ? "mp4" : "webm";
      tmpFilePath = import_path.default.join(import_os.default.tmpdir(), `audio-${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`);
      import_fs.default.writeFileSync(tmpFilePath, Buffer.from(audioBase64, "base64"));
      const transcription = await groq.audio.transcriptions.create({
        file: import_fs.default.createReadStream(tmpFilePath),
        model: customVoiceModel || "whisper-large-v3-turbo",
        response_format: "json"
      });
      let text = transcription.text || "";
      const hallucinations = [
        "thank you",
        "thanks for watching",
        "thank you for watching",
        "please subscribe",
        "subscribed",
        "www.openai.com",
        "you",
        "bye",
        "goodbye",
        "oh",
        "uh",
        "um",
        "i'm sorry",
        "i don't know",
        "the end",
        "watching",
        "be sure to like and subscribe",
        "thanks for listening",
        "thank you so much",
        "subtitle by",
        "subtitles by",
        "amara.org",
        "english subtitles",
        "re-edited by",
        "translated by",
        "you guys",
        "peace",
        "see you in the next one",
        "god bless",
        "thank you for your time",
        "i'll see you next time",
        "don't forget to like",
        "hit the bell icon",
        "thanks for the support",
        "i'll see you in the next video",
        "thanks for joining",
        "have a great day",
        "see you soon",
        "take care",
        "stay tuned",
        "welcome back",
        "let's get started",
        "in this video",
        "today we are going to",
        "if you enjoyed this",
        "leave a comment",
        "share this video"
      ];
      const cleanText = text.trim().toLowerCase().replace(/[.,!?;:]/g, "");
      const corrections = {
        "virtual dome": "virtual DOM",
        "react.js": "React",
        "view.js": "Vue.js",
        "node.js": "Node.js",
        "next.js": "Next.js",
        "typescript": "TypeScript",
        "javascript": "JavaScript",
        "tailwind": "Tailwind CSS",
        "postgress": "PostgreSQL",
        "mongo db": "MongoDB",
        "graphql": "GraphQL",
        "rest api": "REST API",
        "dockerize": "Dockerize",
        "kubernetes": "Kubernetes",
        "aws": "AWS",
        "azure": "Azure",
        "gcp": "GCP",
        "eaml": "YAML",
        "travel inheritance": "types of inheritance",
        "travel inheritances": "types of inheritance"
      };
      let correctedText = text;
      Object.entries(corrections).forEach(([wrong, right]) => {
        const regex = new RegExp(`\\b${wrong}\\b`, "gi");
        correctedText = correctedText.replace(regex, right);
      });
      text = correctedText;
      const isHallucination = hallucinations.some((h) => cleanText === h && text.length < 20);
      if (isHallucination || text.length < 2) {
        text = "";
      }
      if (authReq.user) {
        const voiceMinutes = Math.ceil((audioChunkDuration || 5) / 60);
        await recordVoiceUsage(authReq.user.userId, voiceMinutes);
      }
      const remainingVoice = authReq.user ? await getRemainingQuota(authReq.user.userId, "voice") : 0;
      res.json({
        text,
        usage: {
          voiceMinutesUsed: audioChunkDuration ? Math.ceil(audioChunkDuration / 60) : 0,
          remainingMinutes: remainingVoice
        }
      });
    } catch (error) {
      console.error("Transcription error:", error);
      const status = error.status || 500;
      const message = error.message || "Transcription failed";
      if (status === 429) {
        return res.status(429).json({
          error: "Rate limit reached. Please wait a moment.",
          retryAfter: error.headers?.["retry-after"] || 3
        });
      }
      res.status(status).json({ error: message });
    } finally {
      if (tmpFilePath && import_fs.default.existsSync(tmpFilePath)) {
        import_fs.default.unlinkSync(tmpFilePath);
      }
    }
  });
  app.post("/api/analyze", quotaMiddleware("chat"), async (req, res) => {
    try {
      const authReq = req;
      const customKey = req.headers["x-api-key"] || "";
      const customModel = req.headers["x-model"] || "";
      const persona = req.headers["x-persona"] || "Technical Interviewer";
      const mode = req.headers["x-mode"] || "voice";
      const groq = getGroq(customKey);
      const supportsLogprobs = (model) => {
        const supported = ["llama3-8b-8192"];
        return supported.includes(model);
      };
      const { transcript, resume, jd } = req.body;
      if (!transcript) {
        return res.status(400).json({ error: "No transcript provided" });
      }
      try {
        if (vectorCache.length > 0 && (mode === "chat" || mode === "voice")) {
          const emb = await getEmbedding(transcript);
          let topMatches = [];
          for (const item of vectorCache) {
            if (item.embeddingModel && item.embeddingModel !== "all-MiniLM-L6-v2") continue;
            let maxScore = cosineSimilarity(emb, item.embedding);
            if (item.variantEmbeddings && Array.isArray(item.variantEmbeddings)) {
              for (const varEmb of item.variantEmbeddings) {
                const varScore = cosineSimilarity(emb, varEmb);
                if (varScore > maxScore) {
                  maxScore = varScore;
                }
              }
            }
            topMatches.push({ item, score: maxScore });
          }
          topMatches.sort((a, b) => b.score - a.score);
          const bestMatches = topMatches.slice(0, 5);
          let bestMatch = null;
          let bestScore = -1;
          for (const match of bestMatches) {
            if (match.score > bestScore) {
              bestScore = match.score;
              bestMatch = match.item;
            }
          }
          if (bestMatch && bestScore > 0.82) {
            console.log(`[Cache HIT] Score: ${bestScore.toFixed(2)} | Q: ${bestMatch.question.substring(0, 40)}`);
            if (mode === "chat") {
              return res.json({
                isQuestion: true,
                question: bestMatch.question,
                // Re-map nicely to the clean generated question
                confidence: 1,
                type: bestMatch.answer.type || "concept",
                difficulty: bestMatch.answer.difficulty || "medium",
                sections: bestMatch.answer.sections || [],
                code: bestMatch.answer.code || "",
                codeLanguage: bestMatch.answer.codeLanguage || "",
                bullets: [],
                spoken: bestMatch.answer.spoken || ""
              });
            } else {
              return res.json({
                isQuestion: true,
                question: bestMatch.question,
                confidence: 1,
                type: bestMatch.answer.type || "technical",
                bullets: bestMatch.answer.bullets || bestMatch.answer.sections?.flatMap((s) => s.points || []) || [],
                spoken: bestMatch.answer.spoken || "I can definitely help with that."
              });
            }
          }
        }
      } catch (e) {
        console.error("Vector search failed, falling back to LLM", e);
      }
      if (mode === "chat") {
        let questionType = "concept";
        let difficulty = "medium";
        try {
          const classifyCompletion = await groq.chat.completions.create({
            messages: [
              {
                role: "system",
                content: `You are a classifier. Return ONLY valid JSON, nothing else.
Schema: {"type": "concept | coding | system_design | behavioral", "difficulty": "easy | medium | hard"}
Rules:
- concept: definitions, explanations, comparisons of technologies
- coding: algorithm, data structure, write code, implement
- system_design: architecture, distributed systems, scalability, design a system
- behavioral: experience, soft skills, tell me about a time
- easy: basic definitions, junior-level
- medium: trade-offs, algorithms, intermediate
- hard: system design, architecture, advanced algorithms`
              },
              { role: "user", content: `Classify: ${transcript}` }
            ],
            model: "llama-3.1-8b-instant",
            response_format: { type: "json_object" },
            temperature: 0.1
          });
          let classifyData = {};
          try {
            classifyData = JSON.parse(classifyCompletion.choices[0]?.message?.content || "{}");
          } catch {
          }
          questionType = classifyData.type || "concept";
          difficulty = classifyData.difficulty || "medium";
        } catch {
        }
        const sectionHint = questionType === "coding" ? `Sections MUST be: "Problem Understanding", "Approach & Logic", "Complexity Analysis". Always fill the code field with complete working code.` : questionType === "behavioral" ? `Sections MUST be: "Situation", "What I Did", "Result & Learnings". Write in confident first-person.` : questionType === "system_design" ? `Sections: "Architecture Overview", "Core Components", "Trade-offs & Bottlenecks", "Scaling Strategy". Focus on distributed systems thinking.` : `If comparing TWO things: "X Overview", "Y Overview", "Key Differences", "When To Use Which". If one concept: "What It Is", "How It Works", "Trade-offs", "When To Use".`;
        const depthHint = difficulty === "easy" ? `DEPTH: Focus on clarity and intuition. Avoid unnecessary complexity. Prioritize simple, memorable explanations a junior can follow.` : difficulty === "hard" ? `DEPTH: Break down reasoning deeply. Discuss scalability, reliability, and bottlenecks. Mention trade-offs between approaches. Cite Big-O where relevant.` : `DEPTH: Include practical engineering trade-offs. Mention complexity where relevant. Balance theory with real-world usage.`;
        const chatSystemPrompt = `You are a senior software engineer, system design mentor, and interview coach.

Your task: answer the user's question in a clear, structured, interview-ready format.

STRICT OUTPUT RULE:
Return ONLY valid JSON. Do NOT include markdown, code fences, commentary, or any text outside the JSON object.

JSON SCHEMA (match exactly):
{
  "sections": [
    {
      "title": "Short section title (2-5 words)",
      "content": "2-4 sentences explaining this clearly in a confident, narrative first-person tone. Vary your openers (e.g., 'In my projects...', 'I've found that...', 'Architecturally, I prefer...', 'One thing I prioritize is...'). Avoid repeating 'I typically' or 'In my experience' at the start of every paragraph. NO bullet points inside content.",
      "points": [
        "Short key takeaway (max 12 words)",
        "Short key takeaway (max 12 words)"
      ]
    }
  ],
  "code": "Complete working code if question asks for coding. Otherwise empty string. No markdown fences.",
  "codeLanguage": "language name (csharp, python, javascript, java, sql, etc.) or empty string"
}

SECTION RULES:
${sectionHint}
- Minimum 2 sections, maximum 5 sections.
- Each "content": 2-4 sentences, natural prose, NO nested bullets.
- Each "points": 2-4 items, max 12 words each, crisp and scannable.
- Titles: short, bold-worthy (e.g. "Lambda Syntax", "Time Complexity", "Key Trade-offs").

CODE RULES:
- Only include code if the question asks to write, implement, create, or demonstrate code.
- If code is included: complete and runnable, comments on key lines, handle edge cases (null, empty, etc.).
- No markdown fences inside the "code" field.

${depthHint}

CONTEXT:
Resume: ${resume || "Not provided"}
Job Description: ${jd || "Not provided"}
Persona: ${persona}

PERSONA ADJUSTMENTS:
${persona === "Technical Interviewer" ? "- Emphasize architecture decisions, Big-O complexity, trade-offs, and production concerns." : ""}
${persona === "Executive Assistant" ? "- Emphasize business impact, strategic implications, and communication clarity." : ""}
${persona === "Language Translator" ? "- Emphasize language nuance, cultural context, and translation accuracy." : ""}

FINAL RULE: Return ONLY the JSON object. No markdown. No explanations outside JSON.`;
        const chatModel = "llama-3.3-70b-versatile";
        const chatParams = {
          messages: [
            { role: "system", content: chatSystemPrompt },
            { role: "user", content: `Question: ${transcript}` }
          ],
          model: chatModel,
          temperature: 0.4,
          // Lower = more accurate, less hallucination
          response_format: { type: "json_object" }
        };
        if (supportsLogprobs(chatModel)) {
          chatParams.logprobs = true;
        }
        const chatCompletion = await groq.chat.completions.create(chatParams);
        const chatData = extractJSON(chatCompletion.choices[0]?.message?.content || "{}");
        let confidence = 1;
        const tokens = chatCompletion.choices[0]?.logprobs?.content;
        if (tokens && Array.isArray(tokens) && tokens.length > 0) {
          const avgLogProb = tokens.reduce((s, t) => s + (t.logprob || 0), 0) / tokens.length;
          confidence = Math.exp(avgLogProb);
          console.log(`[Chat] Answer generated with logprob confidence: ${confidence.toFixed(2)}`);
        } else {
          try {
            const confCompletion = await groq.chat.completions.create({
              model: "llama-3.1-8b-instant",
              messages: [
                { role: "system", content: `You are evaluating the quality and correctness of an AI's answer to an interview question. Rate your confidence that the answer correctly and fully addresses the question. Output ONLY a JSON object: {"confidence": number} where the number is a float between 0.0 (completely wrong/irrelevant) and 1.0 (perfectly accurate/highly relevant).` },
                { role: "user", content: `Question: ${transcript}
Answer: ${JSON.stringify(chatData)}` }
              ],
              temperature: 0.1
            });
            const confData = extractJSON(confCompletion.choices[0]?.message?.content || "{}");
            if (typeof confData.confidence === "number") {
              confidence = confData.confidence;
              console.log(`[Chat] Answer generated with LLM self-confidence: ${confidence.toFixed(2)}`);
            }
          } catch {
            console.log(`[Chat] Answer generated with default confidence: 1.0`);
          }
        }
        if ((difficulty === "hard" || questionType === "system_design") && confidence < 0.8) {
          try {
            const verifyCompletion = await groq.chat.completions.create({
              messages: [
                {
                  role: "system",
                  content: `You are a senior engineer reviewing an AI-generated interview answer for correctness.
Check for: factual errors, incorrect Big-O complexity, hallucinated APIs or syntax, missing important edge cases.
Return ONLY valid JSON: {"valid": boolean, "issues": ["issue description"], "improvedSections": <same sections array format, or null if valid>}`
                },
                {
                  role: "user",
                  content: `Original Question: ${transcript}
Generated Answer: ${JSON.stringify(chatData)}`
                }
              ],
              model: "llama-3.1-8b-instant",
              // Fast + cheap for verification
              response_format: { type: "json_object" },
              temperature: 0.2
            });
            let verifyData = { valid: true };
            try {
              verifyData = JSON.parse(verifyCompletion.choices[0]?.message?.content || "{}");
            } catch {
            }
            if (!verifyData.valid && Array.isArray(verifyData.improvedSections) && verifyData.improvedSections.length > 0) {
              chatData.sections = verifyData.improvedSections;
              console.log(`[Verify] Fixed issues: ${verifyData.issues?.join(", ")}`);
            }
          } catch {
          }
        }
        const sections = Array.isArray(chatData.sections) ? chatData.sections : [];
        if (sections.length === 0 && (chatData.explanation || chatData.answer)) {
          sections.push({
            title: "Answer",
            content: chatData.explanation || chatData.answer || "",
            points: Array.isArray(chatData.bullets) ? chatData.bullets : []
          });
        }
        if (authReq.user) {
          await recordChatUsage(authReq.user.userId, 1);
        }
        return res.json({
          isQuestion: true,
          question: transcript,
          confidence: 1,
          type: questionType,
          difficulty,
          sections,
          code: chatData.code || "",
          codeLanguage: chatData.codeLanguage || chatData.language || "",
          bullets: [],
          spoken: chatData.spoken || ""
        });
      } else {
        const voiceSystemPrompt = `You are an AI assistant helping a candidate during a live interview.
Analyze the transcript and determine if the interviewer asked a REAL interview question.
Ignore conversational filler, pleasantries, or technical difficulties (e.g., "Can you hear me?", "How are you?").

Return ONLY valid JSON. No markdown. No extra text.

JSON FORMAT:
{
  "isQuestion": boolean,
  "question": "Detected question or empty string",
  "confidence": 0.0-1.0,
  "type": "technical | behavioral | general",
  "bullets": [
    "Short talking point (max 10 words)",
    "Short talking point (max 10 words)",
    "Short talking point (max 10 words)",
    "Short talking point (max 10 words)"
  ],
  "spoken": "1-2 sentence confident answer the user could say aloud."
}

DETECTION RULES:
- If transcript contains a genuine interview question: isQuestion = true, extract the main question
- If it's just filler/pleasantries (e.g. "I can see your screen", "Let's get started"): isQuestion = false
- If no question detected: isQuestion = false, return empty bullets array

BULLET STYLE \u2014 TECHNICAL QUESTIONS:
Include keyword-dense talking points with:
\u2022 Algorithm or pattern name
\u2022 Big-O complexity (e.g. O(n log n))
\u2022 Key trade-offs
\u2022 Production/edge case consideration
Examples: "HashMap lookup O(1) average case" | "Avoid nested loops, use sorting O(n log n)" | "Handle null and empty input edge cases"

BULLET STYLE \u2014 BEHAVIORAL QUESTIONS (STAR method):
\u2022 Situation: what was the context?
\u2022 Task: what was your responsibility?
\u2022 Action: what did you specifically do?
\u2022 Result: measurable outcome
Examples: "Legacy API slowed under heavy traffic" | "Led async processing refactor" | "Reduced latency by 60%" | "Improved reliability 99.9% uptime"

SPOKEN FIELD: A confident, complete 1-2 sentence answer the user can say out loud immediately.

CONTEXT:
Resume: ${resume || "Not provided"}
Job Description: ${jd || "Not provided"}
Persona: ${persona}
${persona === "Technical Interviewer" ? "\nFocus on engineering depth, Big-O complexity, and edge cases." : ""}
${persona === "Executive Assistant" ? "\nFocus on business impact, decision making, and strategy." : ""}
${persona === "Language Translator" ? "\nTranslate accurately while maintaining tone and cultural context." : ""}

Return ONLY JSON.`;
        const selectedVoiceModel = customModel || "llama-3.1-8b-instant";
        const voiceParams = {
          messages: [
            { role: "system", content: voiceSystemPrompt },
            { role: "user", content: `Transcript: "${transcript}"` }
          ],
          model: selectedVoiceModel,
          response_format: { type: "json_object" },
          temperature: 0.3
          // Low temperature = fast, accurate, deterministic
        };
        if (supportsLogprobs(selectedVoiceModel)) {
          voiceParams.logprobs = true;
        }
        const voiceCompletion = await groq.chat.completions.create(voiceParams);
        const voiceTokens = voiceCompletion.choices[0]?.logprobs?.content;
        let logprobConfidence = -1;
        if (voiceTokens && Array.isArray(voiceTokens) && voiceTokens.length > 0) {
          const avgLogProb = voiceTokens.reduce((s, t) => s + (t.logprob || 0), 0) / voiceTokens.length;
          logprobConfidence = Math.exp(avgLogProb);
          console.log(`[Voice] Question detection API completed with avg logprob confidence: ${logprobConfidence.toFixed(2)}`);
        } else {
          try {
            const confCompletion = await groq.chat.completions.create({
              model: "llama-3.1-8b-instant",
              messages: [
                { role: "system", content: 'You are evaluating an audio transcript to determine if it contains a genuine interview question or just filler conversation. Rate your confidence that the transcript contains a real question. Return ONLY a JSON object: {"confidence": number} where the number is a float between 0.0 (definitely just filler/no question) and 1.0 (definitely a clear question).' },
                { role: "user", content: `Transcript: "${transcript}"` }
              ],
              response_format: { type: "json_object" },
              temperature: 0.1
            });
            const confData = JSON.parse(confCompletion.choices[0]?.message?.content || "{}");
            if (typeof confData.confidence === "number") {
              logprobConfidence = confData.confidence;
              console.log(`[Voice] Question detection API completed with LLM self-confidence: ${logprobConfidence.toFixed(2)}`);
            }
          } catch {
            console.log(`[Voice] Question detection API fallback to default confidence`);
          }
        }
        let voiceData = { isQuestion: false };
        try {
          voiceData = JSON.parse(voiceCompletion.choices[0]?.message?.content || "{}");
          if (logprobConfidence >= 0) {
            voiceData.confidence = logprobConfidence;
          }
        } catch {
          voiceData = { isQuestion: false };
        }
        if (voiceData.isQuestion && voiceData.confidence < 0.2) {
          console.log(`[Voice] Rejected question due to low confidence (< 0.2)`);
          voiceData.isQuestion = false;
        }
        if (authReq.user) {
          await recordChatUsage(authReq.user.userId, 1);
        }
        return res.json(voiceData);
      }
    } catch (error) {
      console.error("Analysis error:", error);
      res.status(500).json({ error: error.message || "Analysis failed" });
    }
  });
  app.post("/api/generate-cache", async (req, res) => {
    const customKey = req.headers["x-api-key"];
    const { jd, resume } = req.body;
    if (!jd || jd.length < 50) {
      console.log("[Cache] JD too short or missing. Skipping.");
      return res.status(400).json({ status: "JD too short" });
    }
    try {
      const groq = getGroq(customKey);
      console.log("[Cache] Starting pre-interview cache generation...");
      const questionsCompletion = await groq.chat.completions.create({
        messages: [
          {
            role: "system",
            content: `You are a senior technical interviewer. Based on this job description, generate 35 distinct, highly likely interview questions.
Include concept questions, system design questions, coding queries, and behavioral questions.
Return ONLY a valid JSON object matching this exact schema:
{
  "questions": [
    "Explain the difference between REST and GraphQL.",
    "Design a scalable notification system.",
    "Tell me about a time you resolved a difficult bug."
  ]
}`
          },
          { role: "user", content: `Job Description:
${jd}` }
        ],
        model: "llama-3.1-8b-instant",
        temperature: 0.3
      });
      const data = extractJSON(questionsCompletion.choices[0]?.message?.content || "{}");
      const questions = Array.isArray(data.questions) ? data.questions : [];
      if (questions.length === 0) {
        console.log("[Cache] Failed to generate questions array.");
        return;
      }
      console.log(`[Cache] Found ${questions.length} questions. Generating answers & embeddings...`);
      vectorCache = [];
      const systemPrompt = `You are a senior software engineer and interview coach.
Answer the interview question comprehensively. Ensure you provide paraphrased variants of the question to assist vector similarity searching.
Return ONLY valid JSON matching exactly:
{
  "variants": ["Paraphrase 1", "Paraphrase 2", "Paraphrase 3"],
  "sections": [
    {
      "title": "Short section title (2-5 words)",
      "content": "2-4 sentences explaining this clearly in a confident, narrative first-person tone. Vary your openers (e.g., 'In my projects...', 'I've found that...', 'Architecturally, I prefer...', 'One thing I prioritize is...'). Avoid repeating 'I typically' or 'In my experience' at the start of every paragraph.",
      "points": ["Scannable key takeaway max 10 words", "Another short takeaway"]
    }
  ],
  "bullets": ["Technical bullet 1", "Technical bullet 2", "Technical bullet 3"],
  "code": "Complete code snippet if coding is requested, else strictly an empty string",
  "codeLanguage": "language name or empty string",
  "spoken": "A 1-2 sentence confident spoken answer.",
  "type": "concept",
  "difficulty": "medium",
  "category": "backend"
}
Keep sections to mostly 2-3 maximum. DO NOT include markdown code fences overall.
RULES:
1. "code" MUST ALWAYS be a string. Never null. Always use "" for empty code.
2. "difficulty" MUST ALWAYS be included exactly as "easy", "medium", or "hard".
3. "variants" MUST include at least 2 conversational variations of the question.`;
      for (const q of questions) {
        try {
          const ansCompletion = await groq.chat.completions.create({
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: `Question: ${q}

Resume Context: ${resume || "None"}
Job Context: ${jd.substring(0, 1e3)}` }
            ],
            model: "llama-3.1-8b-instant",
            // Using 8b for bulk speed
            response_format: { type: "json_object" },
            temperature: 0.2
            // Deterministic
          });
          let answerJson = JSON.parse(ansCompletion.choices[0]?.message?.content || "{}");
          if (answerJson.code === null || answerJson.code === void 0) answerJson.code = "";
          if (!answerJson.difficulty) answerJson.difficulty = "medium";
          const variants = Array.isArray(answerJson.variants) ? answerJson.variants : [];
          delete answerJson.variants;
          const variantEmbeddings = [];
          for (const variant of variants) {
            if (typeof variant === "string" && variant.trim().length > 5) {
              const varEmb = await getEmbedding(variant);
              variantEmbeddings.push(varEmb);
            }
          }
          const emb = await getEmbedding(q);
          vectorCache.push({
            id: Math.random().toString(36).substring(7),
            question: q,
            embeddingModel: "all-MiniLM-L6-v2",
            embedding: emb,
            variants,
            variantEmbeddings,
            answer: answerJson
          });
          console.log(`[Cache] Pre-generated: ${q.substring(0, 45)}... with ${variants.length} variations`);
        } catch (e) {
          console.log(`[Cache] Skipped individual generation for: ${q}`);
        }
      }
      import_fs.default.writeFileSync(CACHE_FILE, JSON.stringify(vectorCache));
      console.log(`[Cache] Success! ${vectorCache.length} questions are now primed natively in vector cache.`);
      res.json({ status: `Successfully cached ${vectorCache.length} questions!` });
    } catch (err) {
      console.error("[Cache] Background generation failed pipeline:", err);
      res.status(500).json({ status: "Generation failed", error: err.message });
    }
  });
  app.get("/api/usage", async (req, res) => {
    try {
      const authReq = req;
      if (!authReq.user) {
        return res.status(401).json({ error: "User not authenticated" });
      }
      const { getUserFromDB: getUserFromDB2, resetMonthlyUsageIfNeeded: resetMonthlyUsageIfNeeded2, calculateTrialDaysRemaining: calculateTrialDaysRemaining2, checkTrialExpired: checkTrialExpired2 } = await Promise.resolve().then(() => (init_usageStorage(), usageStorage_exports));
      const user = await getUserFromDB2(authReq.user.userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      resetMonthlyUsageIfNeeded2(user);
      const planConfig = PLAN_LIMITS[user.plan];
      const response = {
        user: {
          userId: user.userId,
          email: user.email,
          plan: user.plan,
          subscriptionStatus: user.subscriptionStatus
        },
        quotas: {
          voiceMinutes: {
            used: user.voiceMinutesUsed,
            limit: planConfig.voiceMinutesPerMonth,
            remaining: Math.max(0, planConfig.voiceMinutesPerMonth - user.voiceMinutesUsed),
            percentUsed: user.voiceMinutesUsed / planConfig.voiceMinutesPerMonth * 100
          },
          chatMessages: {
            used: user.chatMessagesUsed,
            limit: planConfig.chatMessagesPerMonth,
            remaining: Math.max(0, planConfig.chatMessagesPerMonth - user.chatMessagesUsed),
            percentUsed: user.chatMessagesUsed / planConfig.chatMessagesPerMonth * 100
          },
          sessions: {
            used: user.sessionsUsed,
            limit: planConfig.sessionsPerMonth,
            remaining: Math.max(0, planConfig.sessionsPerMonth - user.sessionsUsed),
            percentUsed: user.sessionsUsed / planConfig.sessionsPerMonth * 100
          }
        },
        features: planConfig.features,
        currentMonth: user.currentMonth,
        trialDaysRemaining: user.plan === "free" && !checkTrialExpired2(user) ? calculateTrialDaysRemaining2(user) : 0
      };
      res.set({
        "Cache-Control": "no-cache, no-store, must-revalidate, max-age=0",
        "Pragma": "no-cache",
        "Expires": "0"
      });
      res.json(response);
    } catch (error) {
      console.error("Usage endpoint error:", error);
      res.status(500).json({ error: "Failed to fetch usage data" });
    }
  });
  app.post("/api/upgrade", async (req, res) => {
    try {
      const authReq = req;
      if (!authReq.user) {
        return res.status(401).json({ error: "User not authenticated" });
      }
      const { newPlan } = req.body;
      if (!["basic", "pro", "enterprise"].includes(newPlan)) {
        return res.status(400).json({ error: "Invalid plan" });
      }
      const upgraded = await upgradeUserPlan(authReq.user.userId, newPlan);
      if (!upgraded) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json({
        message: `Successfully upgraded to ${newPlan} plan`,
        user: { plan: upgraded.plan }
      });
    } catch (error) {
      console.error("Upgrade endpoint error:", error);
      res.status(500).json({ error: "Failed to upgrade plan" });
    }
  });
  app.post("/api/sessions/start", async (req, res) => {
    try {
      const authReq = req;
      console.log("[API] POST /api/sessions/start called");
      console.log("[API] User:", authReq.user?.userId || "NOT AUTHENTICATED");
      console.log("[API] Request body:", JSON.stringify(req.body, null, 2));
      if (!authReq.user) {
        console.error("[API] \u274C User not authenticated");
        return res.status(401).json({ error: "User not authenticated" });
      }
      const { createSession: createSession2 } = await Promise.resolve().then(() => (init_usageStorage(), usageStorage_exports));
      console.log("[API] Calling createSession with userId:", authReq.user.userId);
      const sessionId = await createSession2(authReq.user.userId);
      console.log("[API] createSession returned:", sessionId);
      if (!sessionId) {
        console.error("[API] \u274C Failed to create session (null returned)");
        return res.status(500).json({ error: "Failed to create session" });
      }
      console.log("[API] \u2713 Session created successfully:", sessionId);
      res.json({
        sessionId,
        message: `Session started: ${sessionId}`
      });
    } catch (error) {
      console.error("[API] \u274C Error in POST /api/sessions/start:");
      console.error("[API] Error message:", error.message);
      console.error("[API] Stack:", error.stack);
      res.status(500).json({ error: "Failed to start session", details: error.message });
    }
  });
  app.put("/api/sessions/:sessionId", async (req, res) => {
    try {
      const authReq = req;
      const { sessionId } = req.params;
      const { questionsAsked, voiceMinutesUsed } = req.body;
      if (!authReq.user || !sessionId) {
        return res.status(401).json({ error: "User not authenticated or missing session ID" });
      }
      const { updateSession: updateSession2 } = await Promise.resolve().then(() => (init_usageStorage(), usageStorage_exports));
      await updateSession2(sessionId, questionsAsked || 0, voiceMinutesUsed || 0);
      res.json({
        sessionId,
        message: `Session updated: ${questionsAsked} questions asked`
      });
    } catch (error) {
      console.error("[Session] Failed to update session:", error.message);
      res.status(500).json({ error: "Failed to update session" });
    }
  });
  app.put("/api/sessions/:sessionId/close", async (req, res) => {
    try {
      const authReq = req;
      const { sessionId } = req.params;
      const { status } = req.body;
      if (!authReq.user || !sessionId) {
        return res.status(401).json({ error: "User not authenticated or missing session ID" });
      }
      const finalStatus = status === "completed" || status === "abandoned" ? status : "completed";
      const { closeSession: closeSession2 } = await Promise.resolve().then(() => (init_usageStorage(), usageStorage_exports));
      await closeSession2(sessionId, finalStatus);
      res.json({
        sessionId,
        status: finalStatus,
        message: `Session closed: ${finalStatus}`
      });
    } catch (error) {
      console.error("[Session] Failed to close session:", error.message);
      res.status(500).json({ error: "Failed to close session" });
    }
  });
  app.get("/api/sessions/active", async (req, res) => {
    try {
      const { getActiveSessions: getActiveSessions2 } = await Promise.resolve().then(() => (init_usageStorage(), usageStorage_exports));
      const activeSessions = await getActiveSessions2();
      res.json({
        count: activeSessions.length,
        sessions: activeSessions
      });
    } catch (error) {
      console.error("[Session] Failed to fetch active sessions:", error.message);
      res.status(500).json({ error: "Failed to fetch active sessions" });
    }
  });
  app.get("/api/sessions/history", async (req, res) => {
    try {
      const authReq = req;
      if (!authReq.user) {
        return res.status(401).json({ error: "User not authenticated" });
      }
      const { getUserSessionHistory: getUserSessionHistory2 } = await Promise.resolve().then(() => (init_usageStorage(), usageStorage_exports));
      const history = await getUserSessionHistory2(authReq.user.userId);
      res.json({
        userId: authReq.user.userId,
        sessionCount: history.length,
        sessions: history
      });
    } catch (error) {
      console.error("[Session] Failed to fetch session history:", error.message);
      res.status(500).json({ error: "Failed to fetch session history" });
    }
  });
  if (process.env.NODE_ENV !== "production") {
    const viteModule = await import("vite");
    const vite = await viteModule.createServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(__dirname, "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  return new Promise((resolve) => {
    const startListen = (port) => {
      httpServer.listen(port, "0.0.0.0", () => {
        console.log(`Server running on http://localhost:${port}`);
        resolve(port);
      }).on("error", (err) => {
        if (err.code === "EADDRINUSE") {
          console.warn(`[Server] Port ${port} is in use, trying ${port + 1}...`);
          startListen(port + 1);
        } else {
          console.error(err);
        }
      });
    };
    startListen(initialPort);
  });
}
startServer().catch(console.error);
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  startServer
});
