# InterviewGuru Pricing Plan System Architecture

> **Status**: Design Document for Implementation  
> **Date**: March 31, 2026  
> **Integration**: Clerk Auth + Backend Usage Tracking

---

## 📋 Plan Tiers Definition

### **FREE TIER** (7-day Trial)
- Duration: 7 days from sign-up
- Voice Mode: 10 minutes total
- Chat Mode: 10 questions/messages
- Features:
  - ✅ Basic 3-persona access
  - ✅ Vector cache (pre-generated)
  - ❌ No TTS (text-to-speech)
  - ❌ No session export
  - ❌ Limited to Voice + Chat mode only

### **BASIC PLAN** ($9.99/month or $99/year)
- Duration: Monthly subscription
- Voice Mode: 1 Interview session (60 min or 1 session boundary)
- Chat Mode: Unlimited messages within 1 session
- Features:
  - ✅ All Free features
  - ✅ TTS enabled
  - ✅ Session export/history
  - ✅ Resume + JD context storage
  - ✅ Custom personas

### **PRO PLAN** ($29.99/month or $299/year)
- Duration: Monthly subscription
- Voice Mode: 10 interview sessions (600 min or 10 session boundaries)
- Chat Mode: Unlimited
- Features:
  - ✅ All Basic features
  - ✅ Priority API access
  - ✅ Offline cache (upcoming)
  - ✅ Advanced verification pipeline
  - ✅ Custom LLM model selection

### **ENTERPRISE** (Contact Sales)
- Custom quotas and features

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     CLERK FRONTEND                          │
│  (Authentication Gate, User Identification)                 │
└────────────────────┬────────────────────────────────────────┘
                     │
     ┌───────────────┴──────────────┐
     │ useUser() + Session Token    │
     │ (Clerk JWT in cookies)       │
     ▼                              ▼
┌──────────────────────────────────────────┐
│    React Frontend (OverlayWidget)        │
│  ┌────────────────────────────────────┐  │
│  │ Feature Gating:                    │  │
│  │ - Check plan tier                  │  │
│  │ - Show/hide TTS button             │  │
│  │ - Warn on quota exhaustion         │  │
│  │ - Block overage usage              │  │
│  └────────────────────────────────────┘  │
│  ┌────────────────────────────────────┐  │
│  │ Usage Display:                     │  │
│  │ - X of 10 chats used               │  │
│  │ - Y of 10 min voice used           │  │
│  │ - Days remaining (Free tier)       │  │
│  └────────────────────────────────────┘  │
└──────────────────┬───────────────────────┘
                   │
     ┌─────────────┴──────────────┐
     │ All API Calls with         │
     │ Authorization: Bearer JWT  │
     ▼                            ▼
┌──────────────────────────────────────────────────────────┐
│            Express Backend (server.ts)                   │
│  ┌──────────────────────────────────────────────────────┤
│  │ 1. JWT Verification Middleware                        │
│  │    - Extract Clerk JWT from Authorization header      │
│  │    - Verify signature with Clerk's public key         │
│  │    - Extract userId, email, custom claims             │
│  ├──────────────────────────────────────────────────────┤
│  │ 2. User Plan Lookup                                   │
│  │    - Check user.plan in Clerk metadata                │
│  │    - Or lookup in users.json (usage tracking)         │
│  │    - Return: { plan: 'free'|'basic'|'pro', ...}      │
│  ├──────────────────────────────────────────────────────┤
│  │ 3. Usage Check                                        │
│  │    - Load user's usage from storage                   │
│  │    - Calculate remaining quota for this month         │
│  │    - If over limit → return 402 Payment Required      │
│  │    - Otherwise → proceed with request                 │
│  ├──────────────────────────────────────────────────────┤
│  │ 4. Usage Recording                                    │
│  │    - After API call succeeds:                         │
│  │    - Record: timestamp, endpoint, duration, tokens    │
│  │    - Increment: chatCount or voiceMinutes             │
│  │    - Persist to storage                               │
│  ├──────────────────────────────────────────────────────┤
│  │ 5. Response to Frontend                               │
│  │    - Include headers: X-Remaining-Chats,              │
│  │      X-Remaining-Minutes, X-Plan-Tier                │
│  └──────────────────────────────────────────────────────┘
└──────────────────────────────────────────────────────────┘
                   │
     ┌─────────────┴──────────────┐
     │ Persist Usage:             │
     │ ~/.interviewguru/          │
     │  └─ users.json             │
     ▼                            ▼
┌──────────────────────────────────────────┐
│  Persistent Storage (JSON File)          │
│  ┌──────────────────────────────────────┤
│  │ {                                    │
│  │   "users": {                         │
│  │     "clerk_user_123": {              │
│  │       "email": "user@example.com",   │
│  │       "plan": "basic",               │
│  │       "subscriptionStart": "...",    │
│  │       "usage": {                     │
│  │         "month": 3,                  │
│  │         "year": 2026,                │
│  │         "chatsUsed": 5,              │
│  │         "voiceMinutesUsed": 15.5,    │
│  │         "sessionsUsed": 1            │
│  │       }                              │
│  │     }                                │
│  │   }                                  │
│  │ }                                    │
│  └──────────────────────────────────────┘
└──────────────────────────────────────────┘
```

---

## 📁 Files to Create/Modify

### **NEW FILES to Create:**

1. **`src/lib/planLimits.ts`** — Plan tier definitions
2. **`src/lib/usagecalculator.ts`** — Usage calculation logic
3. **`src/hooks/usePlanStatus.ts`** — Hook to fetch plan + usage
4. **`src/components/PlanBanner.tsx`** — Display plan info & upgrade CTA
5. **`src/components/UsageBar.tsx`** — Visual usage indicator
6. **`src/components/PlanUpgradeModal.tsx`** — Upgrade flow
7. **`server/lib/clerkAuth.ts`** — Clerk JWT verification
8. **`server/lib/usageStorage.ts`** — File-based usage tracking
9. **`server/middleware/authMiddleware.ts`** — Auth + plan check
10. **`server/api/usage.ts`** — GET user's usage statistics

### **MODIFY EXISTING:**

1. **`server.ts`** — Add middleware, update endpoints
2. **`src/components/OverlayWidget.tsx`** — Add usage display + feature gating
3. **`src/hooks/useAIAssistant.ts`** — Update API call headers
4. **`src/hooks/useTabAudioCapture.ts`** — Add duration tracking
5. **`src/App.tsx`** — Add plan upgrade routes

---

## 🔌 Implementation Steps

### **STEP 1: Configure Clerk in Backend**

#### What Clerk Provides:
- JWT token in HTTP `Authorization: Bearer <jwt>` cookie
- Token contains: `userId`, `email`, `custom_claims` (metadata)
- Public key endpoint: https://{{instance}}.clerk.accounts.com/.well-known/jwks.json

#### Task:
```typescript
// server/lib/clerkAuth.ts

import { jwtDecode } from 'jwt-decode';
import axios from 'axios';

interface DecodedToken {
  sub: string;           // Clerk user ID
  email: string;
  plan?: string;         // Custom claim
  exp: number;
}

export async function verifyClerkToken(token: string): Promise<DecodedToken> {
  try {
    // In production, you'd verify the signature using Clerk's public key
    // For now, we'll do basic JWT decode (unsafe but gets you started)
    const decoded = jwtDecode<DecodedToken>(token);
    
    if (!decoded.sub) throw new Error('Invalid token: no user ID');
    if (decoded.exp * 1000 < Date.now()) throw new Error('Token expired');
    
    return decoded;
  } catch (error) {
    throw new Error(`Auth failed: ${error.message}`);
  }
}

export function extractJwt(headers: Record<string, string>): string {
  const auth = headers['authorization'] || headers['Authorization'];
  if (!auth?.startsWith('Bearer ')) throw new Error('No auth token');
  return auth.slice(7);
}
```

---

### **STEP 2: Define Plan Limits**

```typescript
// src/lib/planLimits.ts

export type PlanTier = 'free' | 'basic' | 'pro' | 'enterprise';

export interface PlanConfig {
  name: string;
  voiceMinutes: number;          // Per month/session
  chatMessages: number;          // Per month
  sessions: number;              // Per month
  featureTTS: boolean;
  featureExport: boolean;
  featureOfflineCache: boolean;
  trialDays?: number;            // For free tier
}

export const PLAN_LIMITS: Record<PlanTier, PlanConfig> = {
  free: {
    name: 'Free Trial (7 days)',
    voiceMinutes: 10,
    chatMessages: 10,
    sessions: 1,
    featureTTS: false,
    featureExport: false,
    featureOfflineCache: false,
    trialDays: 7
  },
  basic: {
    name: 'Basic',
    voiceMinutes: 60,             // Per session in interview
    chatMessages: Infinity,       // Unlimited within session
    sessions: 1,                  // 1 interview session
    featureTTS: true,
    featureExport: true,
    featureOfflineCache: false
  },
  pro: {
    name: 'Pro',
    voiceMinutes: 600,            // 10 sessions × 60 min
    chatMessages: Infinity,
    sessions: 10,
    featureTTS: true,
    featureExport: true,
    featureOfflineCache: true
  },
  enterprise: {
    name: 'Enterprise',
    voiceMinutes: Infinity,
    chatMessages: Infinity,
    sessions: Infinity,
    featureTTS: true,
    featureExport: true,
    featureOfflineCache: true
  }
};

export function getPlanConfig(plan: PlanTier): PlanConfig {
  return PLAN_LIMITS[plan] || PLAN_LIMITS.free;
}

export function isTrialExpired(createdAt: number, trialDays: number): boolean {
  const now = Date.now();
  const trialEnd = createdAt + trialDays * 24 * 60 * 60 * 1000;
  return now > trialEnd;
}
```

---

### **STEP 3: Usage Tracking Storage**

```typescript
// server/lib/usageStorage.ts

import fs from 'fs';
import path from 'path';
import os from 'os';

const STORAGE_DIR = path.join(os.homedir(), '.interviewguru');
const USAGE_FILE = path.join(STORAGE_DIR, 'users.json');

export interface UserUsage {
  userId: string;
  email: string;
  plan: 'free' | 'basic' | 'pro' | 'enterprise';
  createdAt: number;           // Timestamp for free trial expiration
  subscriptionStart?: number;  // For paid plans
  usage: {
    month: number;             // 1-12
    year: number;              // YYYY
    chatCount: number;         // Total chats this month
    voiceMinutes: number;      // Total voice minutes this month
    sessionsUsed: number;      // Interview sessions this month
  };
  lastUpdated: number;
}

export interface UsersDB {
  users: Record<string, UserUsage>;
}

function ensureStorage() {
  if (!fs.existsSync(STORAGE_DIR)) {
    fs.mkdirSync(STORAGE_DIR, { recursive: true });
  }
  if (!fs.existsSync(USAGE_FILE)) {
    fs.writeFileSync(USAGE_FILE, JSON.stringify({ users: {} }, null, 2));
  }
}

export function loadUsers(): UsersDB {
  ensureStorage();
  try {
    const data = fs.readFileSync(USAGE_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return { users: {} };
  }
}

export function saveUsers(db: UsersDB) {
  ensureStorage();
  fs.writeFileSync(USAGE_FILE, JSON.stringify(db, null, 2));
}

export function getOrCreateUser(userId: string, email: string, plan: string = 'free'): UserUsage {
  const db = loadUsers();
  
  if (db.users[userId]) {
    return db.users[userId];
  }

  const now = new Date();
  const newUser: UserUsage = {
    userId,
    email,
    plan: plan as any,
    createdAt: Date.now(),
    usage: {
      month: now.getMonth() + 1,
      year: now.getFullYear(),
      chatCount: 0,
      voiceMinutes: 0,
      sessionsUsed: 0
    },
    lastUpdated: Date.now()
  };

  db.users[userId] = newUser;
  saveUsers(db);
  return newUser;
}

export function updateUsage(userId: string, updates: Partial<UserUsage['usage']>) {
  const db = loadUsers();
  if (!db.users[userId]) return;

  db.users[userId].usage = {
    ...db.users[userId].usage,
    ...updates
  };
  db.users[userId].lastUpdated = Date.now();
  saveUsers(db);
}

export function recordChatUsage(userId: string) {
  const db = loadUsers();
  if (!db.users[userId]) return;
  
  db.users[userId].usage.chatCount++;
  db.users[userId].lastUpdated = Date.now();
  saveUsers(db);
}

export function recordVoiceUsage(userId: string, minutes: number) {
  const db = loadUsers();
  if (!db.users[userId]) return;
  
  db.users[userId].usage.voiceMinutes += minutes;
  db.users[userId].lastUpdated = Date.now();
  saveUsers(db);
}

export function resetMonthlyUsageIfNeeded(userId: string): boolean {
  const db = loadUsers();
  const user = db.users[userId];
  if (!user) return false;

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  if (user.usage.month !== currentMonth || user.usage.year !== currentYear) {
    // New month, reset counts
    user.usage = {
      month: currentMonth,
      year: currentYear,
      chatCount: 0,
      voiceMinutes: 0,
      sessionsUsed: 0
    };
    user.lastUpdated = Date.now();
    saveUsers(db);
    return true;
  }

  return false;
}
```

---

### **STEP 4: Auth Middleware**

```typescript
// server/middleware/authMiddleware.ts

import { Request, Response, NextFunction } from 'express';
import { verifyClerkToken, extractJwt } from '../lib/clerkAuth';
import { getOrCreateUser, resetMonthlyUsageIfNeeded } from '../lib/usageStorage';
import { PLAN_LIMITS } from '../../src/lib/planLimits';

declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        email: string;
        plan: 'free' | 'basic' | 'pro' | 'enterprise';
        usage: any;
        remaining: {
          chats: number;
          voiceMinutes: number;
          sessionsUsed: number;
        };
      };
    }
  }
}

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    // Skip auth for public endpoints
    if (req.path === '/api/health' || req.path === '/') {
      return next();
    }

    // Extract & verify JWT
    const token = extractJwt(req.headers);
    const decoded = await verifyClerkToken(token);

    // Get or create user
    const userUsage = getOrCreateUser(decoded.sub, decoded.email);
    
    // Reset counters if new month
    resetMonthlyUsageIfNeeded(decoded.sub);

    // Calculate remaining quota
    const planConfig = PLAN_LIMITS[userUsage.plan];
    const remaining = {
      chats: planConfig.chatMessages === Infinity 
        ? Infinity 
        : Math.max(0, planConfig.chatMessages - userUsage.usage.chatCount),
      voiceMinutes: planConfig.voiceMinutes === Infinity 
        ? Infinity 
        : Math.max(0, planConfig.voiceMinutes - userUsage.usage.voiceMinutes),
      sessionsUsed: userUsage.usage.sessionsUsed
    };

    // Attach user to request
    req.user = {
      userId: decoded.sub,
      email: decoded.email,
      plan: userUsage.plan,
      usage: userUsage.usage,
      remaining
    };

    // Set response headers so frontend knows limits
    res.setHeader('X-Plan-Tier', userUsage.plan);
    res.setHeader('X-Remaining-Chats', remaining.chats);
    res.setHeader('X-Remaining-Minutes', remaining.voiceMinutes);
    res.setHeader('X-Remaining-Sessions', remaining.sessionsUsed);

    next();
  } catch (error) {
    return res.status(401).json({ error: 'Unauthorized', details: error.message });
  }
}

export function enforceQuotaMiddleware(req: Request, res: Response, next: NextFunction) {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated' });

  const apiPath = req.path;
  const remaining = req.user.remaining;

  // Check quotas based on endpoint
  if (apiPath === '/api/analyze' || apiPath === '/api/transcribe') {
    // Chat or voice call
    if (remaining.chats === 0) {
      return res.status(402).json({
        error: 'Chat quota exceeded for this month',
        plan: req.user.plan,
        upgrade: 'https://app.interviewguru.ai/pricing'
      });
    }
  }

  if (apiPath === '/api/transcribe') {
    // Voice call
    if (remaining.voiceMinutes === 0) {
      return res.status(402).json({
        error: 'Voice minutes quota exceeded for this month',
        plan: req.user.plan,
        upgrade: 'https://app.interviewguru.ai/pricing'
      });
    }
  }

  next();
}
```

---

### **STEP 5: Update Backend Endpoints**

```typescript
// In server.ts, add middleware to all protected routes:

import { authMiddleware, enforceQuotaMiddleware } from './middleware/authMiddleware';
import { recordChatUsage, recordVoiceUsage } from './lib/usageStorage';

// Apply auth to all API routes
app.use('/api', authMiddleware, enforceQuotaMiddleware);

// Update /api/analyze
app.post("/api/analyze", async (req, res) => {
  try {
    const userId = req.user!.userId;  // Now available!
    const { transcript, resume, jd } = req.body;
    
    // ... existing LLM logic ...
    
    // After successful response:
    recordChatUsage(userId);
    
    res.setHeader('X-Usage-Updated', 'true');
    res.json({ /* response */ });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update /api/transcribe
app.post("/api/transcribe", async (req, res) => {
  try {
    const userId = req.user!.userId;
    const { audioBase64, mimeType } = req.body;
    
    // ... existing Whisper logic ...
    
    // Record voice usage (estimate from audio duration)
    const durationSeconds = calculateAudioDuration(audioBase64, mimeType);
    const durationMinutes = durationSeconds / 60;
    recordVoiceUsage(userId, durationMinutes);
    
    res.json({ text });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// New endpoint: Get usage stats
app.get("/api/usage", async (req, res) => {
  try {
    const userId = req.user!.userId;
    const db = loadUsers();
    const userUsage = db.users[userId];
    
    if (!userUsage) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      plan: userUsage.plan,
      usage: userUsage.usage,
      limits: PLAN_LIMITS[userUsage.plan],
      remaining: req.user!.remaining,
      trialExpired: isTrialExpired(userUsage.createdAt, 7)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

---

### **STEP 6: Frontend - Add Plan Status Hook**

```typescript
// src/hooks/usePlanStatus.ts

import { useUser } from '@clerk/react';
import { useEffect, useState } from 'react';

export interface UsageStatus {
  plan: 'free' | 'basic' | 'pro' | 'enterprise';
  usage: {
    chatCount: number;
    voiceMinutes: number;
    sessionsUsed: number;
  };
  remaining: {
    chats: number | Infinity;
    voiceMinutes: number | Infinity;
    sessionsUsed: number;
  };
  limits: any;
  trialExpired: boolean;
  isLoading: boolean;
  error?: string;
}

export function usePlanStatus(): UsageStatus {
  const { isSignedIn, user } = useUser();
  const [status, setStatus] = useState<UsageStatus>({
    plan: 'free',
    usage: { chatCount: 0, voiceMinutes: 0, sessionsUsed: 0 },
    remaining: { chats: 10, voiceMinutes: 10, sessionsUsed: 1 },
    limits: {},
    trialExpired: false,
    isLoading: true,
  });

  useEffect(() => {
    if (!isSignedIn) {
      setStatus(prev => ({ ...prev, isLoading: false }));
      return;
    }

    async function fetchUsage() {
      try {
        const token = await user?.getIdToken();
        const res = await fetch('/api/usage', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!res.ok) throw new Error('Failed to fetch usage');

        const data = await res.json();
        setStatus(prev => ({
          ...prev,
          ...data,
          isLoading: false
        }));
      } catch (error) {
        setStatus(prev => ({
          ...prev,
          error: error.message,
          isLoading: false
        }));
      }
    }

    fetchUsage();
    const interval = setInterval(fetchUsage, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, [isSignedIn, user]);

  return status;
}
```

---

### **STEP 7: Frontend - Usage Display Components**

```typescript
// src/components/UsageBar.tsx

import { usePlanStatus } from '../hooks/usePlanStatus';

export function UsageBar() {
  const { plan, remaining, limits, usage } = usePlanStatus();

  if (plan === 'enterprise') return null; // No limits for enterprise

  return (
    <div className="bg-slate-800 border border-cyan-600 rounded-lg p-3 space-y-2">
      <div className="text-xs text-cyan-300 font-semibold uppercase">{plan} Plan</div>
      
      {/* Chats Usage */}
      {remaining.chats !== Infinity && (
        <div>
          <div className="flex justify-between text-xs text-gray-300 mb-1">
            <span>Chats</span>
            <span>{usage.chatCount} / {limits.chatMessages}</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div
              className="bg-cyan-500 h-2 rounded-full transition-all"
              style={{
                width: `${(usage.chatCount / limits.chatMessages) * 100}%`
              }}
            />
          </div>
        </div>
      )}

      {/* Voice Usage */}
      {remaining.voiceMinutes !== Infinity && (
        <div>
          <div className="flex justify-between text-xs text-gray-300 mb-1">
            <span>Voice Minutes</span>
            <span>{usage.voiceMinutes.toFixed(1)} / {limits.voiceMinutes}</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div
              className="bg-purple-500 h-2 rounded-full transition-all"
              style={{
                width: `${(usage.voiceMinutes / limits.voiceMinutes) * 100}%`
              }}
            />
          </div>
        </div>
      )}

      {/* Trial Expiration */}
      {plan === 'free' && (
        <div className="text-xs text-orange-400">
          ⏰ Free trial expires in {7 - Math.floor((Date.now() - createdAt) / (24 * 60 * 60 * 1000))} days
        </div>
      )}
    </div>
  );
}
```

---

### **STEP 8: Frontend - Update API Calls**

```typescript
// In useAIAssistant.ts, update fetch requests:

import { useUser } from '@clerk/react';

export function useAIAssistant() {
  const { user } = useUser();
  
  const analyzeQuestion = async (transcript: string) => {
    const token = await user?.getIdToken();
    
    const response = await fetch('/api/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,  // ← Add this
        'X-Persona': persona
      },
      body: JSON.stringify({ transcript, resume, jd })
    });

    // Check for quota exceeded
    if (response.status === 402) {
      const data = await response.json();
      showUpgradeModal(data);
      return;
    }

    // Extract remaining quota from response headers
    const remainingChats = response.headers.get('X-Remaining-Chats');
    const remainingMinutes = response.headers.get('X-Remaining-Minutes');
    
    setRemainingChats(parseInt(remainingChats || '0'));
    setRemainingMinutes(parseFloat(remainingMinutes || '0'));
    
    return response.json();
  };
}
```

---

## 🎯 Integration Checklist

- [ ] Set up Clerk JWT verification in backend
- [ ] Create plan limits configuration
- [ ] Implement usage storage layer (users.json)
- [ ] Add auth middleware to express
- [ ] Add quota enforcement middleware
- [ ] Update all API endpoints with auth
- [ ] Create usage tracking hooks
- [ ] Add usage display components
- [ ] Update frontend API calls with JWT
- [ ] Create upgrade modal/pricing page
- [ ] Test plan enforcement (quota exceeded)
- [ ] Test trial expiration
- [ ] Add usage stats API endpoint
- [ ] Implement monthly reset logic
- [ ] Add admin dashboard for usage monitoring

---

## 🔒 Clerk Integration Details

### Get Clerk JWT Token (Frontend)

```typescript
import { useUser } from '@clerk/react';

function MyComponent() {
  const { user } = useUser();

  const getToken = async () => {
    const token = await user?.getIdToken();  // JWT token
    console.log(token);  // Send to backend via Authorization header
  };
}
```

### Verify Token (Backend)

**Option 1: Simple Decode (⚠️ Not production-safe, but works for MVP)**
```typescript
import { jwtDecode } from 'jwt-decode';

function verifyToken(token) {
  const decoded = jwtDecode(token);
  return decoded.sub;  // Clerk user ID
}
```

**Option 2: Full Signature Verification (Production)**
```typescript
import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';

const client = jwksClient({
  jwksUri: `https://${process.env.CLERK_INSTANCE}.clerk.accounts.com/.well-known/jwks.json`
});

async function verifyToken(token) {
  const decoded = jwt.decode(token, { complete: true });
  const key = await client.getSigningKey(decoded.header.kid);
  
  const verified = jwt.verify(token, key.getPublicKey());
  return verified.sub;  // Clerk user ID
}
```

---

## 💰 Monetization Flow

1. **User signs up** → Assigned `free` plan, trial expires after 7 days
2. **Free trial used up** → Shown upgrade modal
3. **User clicks "Upgrade"** → Sent to `/pricing` page (Stripe/Paddle integration)
4. **After payment** → Clerk metadata updated: `plan: 'basic'` or `plan: 'pro'`
5. **On next API call** → Backend checks updated plan, new quotas applied

---

## 📊 Monitoring & Analytics

Track:
- Active users by plan tier
- Quota usage trends
- Churn rate (free → expired without upgrade)
- Feature usage by tier
- API call patterns

Store in `users.json` or integrate with analytics service (Segment, Mixpanel, et)

---

## Next Steps

1. Choose storage backend: JSON file (MVP) vs. Database (production)
2. Integrate Stripe/Paddle for payment processing
3. Add Clerk webhook to update plan when payment succeeds
4. Build admin dashboard for monitoring usage
5. Implement feature flags for gradual rollout
