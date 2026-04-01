import { Request, Response, NextFunction, RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import { AuthRequest } from '../../shared/types';
import { PLAN_LIMITS } from '../../shared/constants/planLimits';
import {
  getUserFromDB,
  createUserInDB,
  resetMonthlyUsageIfNeeded,
  checkTrialExpired,
  getTrialSecurityByFingerprint,
  registerTrialSecurityClaim,
  touchTrialSecurityClaim,
} from '../storage/usageStorage';

function normalizeHeaderValue(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value.join(',');
  }

  return value || '';
}

function getClientIp(req: Request): string {
  const forwardedFor = normalizeHeaderValue(req.headers['x-forwarded-for']);
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }

  return req.socket.remoteAddress || req.ip || 'unknown-ip';
}

function buildTrialFingerprint(req: Request): {
  fingerprintHash: string;
  ipHash: string;
  userAgentHash: string;
} {
  const salt = process.env.TRIAL_SECURITY_SALT || 'interviewguru-trial-security-v1';
  const clientIp = getClientIp(req);
  const userAgent = normalizeHeaderValue(req.headers['user-agent']).toLowerCase();
  const acceptLanguage = normalizeHeaderValue(req.headers['accept-language']).toLowerCase().toLowerCase();
  const clientHint = normalizeHeaderValue(req.headers['x-client-fingerprint']).toLowerCase();

  const ipHash = crypto.createHash('sha256').update(`${salt}:${clientIp}`).digest('hex');
  const userAgentHash = crypto.createHash('sha256').update(`${salt}:${userAgent}`).digest('hex');
  const fingerprintHash = crypto
    .createHash('sha256')
    .update(`${salt}:${clientIp}:${userAgent}:${acceptLanguage}:${clientHint}`)
    .digest('hex');

  return {
    fingerprintHash,
    ipHash,
    userAgentHash,
  };
}

function getTrialExpiryDate(): Date {
  const trialDays = PLAN_LIMITS.free.trialDays || 7;
  return new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000);
}

/**
 * Authentication middleware: Extract Clerk JWT from Authorization header
 * For MVP: Simple JWT decode (no signature verification)
 * For production: Implement full JWT signature verification against Clerk keys
 */
export const authMiddleware: RequestHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Missing or invalid authorization header' });
      return;
    }

    const token = authHeader.substring(7); // Remove "Bearer " prefix

    // MVP: Simple JWT decode (WARNING: NO signature verification)
    const decoded = jwt.decode(token) as any;
    if (!decoded || !decoded.sub) {
      res.status(401).json({ error: 'Invalid token' });
      return;
    }

    // Extract Clerk user ID from 'sub' claim
    const clerkUserId = decoded.sub; // Format: "user_XXXXX"
    console.log(`[Auth] Clerk user ID: ${clerkUserId}, email: ${decoded.email}`);

    const trialSecurity = buildTrialFingerprint(req);

    // Load user from database (with cache)
    let userRecord = await getUserFromDB(clerkUserId);

    if (!userRecord) {
      const existingTrialClaim = await getTrialSecurityByFingerprint(trialSecurity.fingerprintHash);
      if (existingTrialClaim && existingTrialClaim.userId !== clerkUserId) {
        res.status(402).json({
          error: 'Free trial already used',
          action: 'upgrade',
          message: 'This device/network has already claimed the free trial. Please sign in with the original account or upgrade to continue.',
        });
        return;
      }

      // First-time user: create in database
      userRecord = await createUserInDB(clerkUserId, decoded.email || '');
      await registerTrialSecurityClaim({
        fingerprintHash: trialSecurity.fingerprintHash,
        userId: clerkUserId,
        email: decoded.email || '',
        ipHash: trialSecurity.ipHash,
        userAgentHash: trialSecurity.userAgentHash,
        trialExpiresAt: getTrialExpiryDate().getTime(),
      });
      console.log(`[Auth] ✓ New user: ${clerkUserId.substring(0, 20)}...`);
    } else {
      // Check if user's trial has expired
      if (userRecord.plan === 'free' && checkTrialExpired(userRecord)) {
        console.log(`[Auth] ✗ Trial expired: ${userRecord.email}`);
        res.status(402).json({
          error: 'Free trial expired',
          action: 'upgrade',
          message: 'Your 7-day trial has ended. Please upgrade to continue.',
        });
        return;
      }

      if (userRecord.plan === 'free') {
        const existingTrialClaim = await getTrialSecurityByFingerprint(trialSecurity.fingerprintHash);
        if (existingTrialClaim && existingTrialClaim.userId !== clerkUserId) {
          res.status(402).json({
            error: 'Free trial already used',
            action: 'upgrade',
            message: 'This device/network has already claimed the free trial. Please sign in with the original account or upgrade to continue.',
          });
          return;
        }

        await registerTrialSecurityClaim({
          fingerprintHash: trialSecurity.fingerprintHash,
          userId: clerkUserId,
          email: userRecord.email,
          ipHash: trialSecurity.ipHash,
          userAgentHash: trialSecurity.userAgentHash,
          trialExpiresAt: getTrialExpiryDate().getTime(),
        });

        await touchTrialSecurityClaim({
          fingerprintHash: trialSecurity.fingerprintHash,
          userId: clerkUserId,
          email: userRecord.email,
        });
      }
    }

    (req as AuthRequest).user = {
      userId: clerkUserId,
      email: userRecord.email,
      plan: userRecord.plan,
    };

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
};

/**
 * Quota enforcement middleware
 * Check if user has remaining quota before processing request
 */
export function quotaMiddleware(quotaType: 'voice' | 'chat' | 'session'): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const authReq = req as AuthRequest;
    
    if (!authReq.user) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    // Load user from database
    const user = await getUserFromDB(authReq.user.userId);

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Reset monthly usage if month has changed (this updates the database)
    const shouldReset = resetMonthlyUsageIfNeeded(user);
    if (shouldReset) {
      console.log(`[Quota] Monthly usage reset for user ${authReq.user.userId}`);
    }

    const planConfig = PLAN_LIMITS[user.plan];

    // Check quotas based on request type
    switch (quotaType) {
      case 'voice':
        if (user.voiceMinutesUsed >= planConfig.voiceMinutesPerMonth) {
          res.status(402).json({
            error: 'Voice quota exceeded',
            quotaUsed: user.voiceMinutesUsed,
            quotaLimit: planConfig.voiceMinutesPerMonth,
            message: `Monthly voice limit (${planConfig.voiceMinutesPerMonth}m) reached`,
          });
          return;
        }
        break;

      case 'chat':
        if (user.chatMessagesUsed >= planConfig.chatMessagesPerMonth) {
          res.status(402).json({
            error: 'Chat quota exceeded',
            quotaUsed: user.chatMessagesUsed,
            quotaLimit: planConfig.chatMessagesPerMonth,
            message: `Monthly chat limit (${planConfig.chatMessagesPerMonth}) reached`,
          });
          return;
        }
        break;

      case 'session':
        if (user.sessionsUsed >= planConfig.sessionsPerMonth) {
          res.status(402).json({
            error: 'Session quota exceeded',
            quotaUsed: user.sessionsUsed,
            quotaLimit: planConfig.sessionsPerMonth,
            message: `Monthly session limit (${planConfig.sessionsPerMonth}) reached`,
          });
          return;
        }
        break;
    }

    next();
  };
}
