import type { PlanTier } from '../constants/planLimits';

export interface UserRecord {
  userId: string;
  email: string;
  plan: PlanTier;
  trialsUsed: boolean;
  trialStartDate?: number;
  subscriptionStatus: 'active' | 'expired' | 'cancelled' | 'trial';

  currentMonth: string;
  voiceMinutesUsed: number;
  chatMessagesUsed: number;
  sessionsUsed: number;

  activeSessions: string[];
  sessionHistory: SessionRecord[];

  createdAt: number;
  lastActiveAt: number;
  stripeCustomerId?: string;
}

export interface SessionRecord {
  sessionId: string;
  startTime: number;
  endTime?: number;
  questionsAsked: number;
  voiceMinutesUsed: number;
  status: 'active' | 'completed' | 'abandoned';
}

export interface AuthRequest extends Express.Request {
  user?: {
    userId: string;
    email: string;
    plan: PlanTier;
  };
}

export interface QuotaExceededError {
  error: string;
  quotaUsed: number;
  quotaLimit: number;
  message: string;
}