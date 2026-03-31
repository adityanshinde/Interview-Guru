import { Request, Response, NextFunction, RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { AuthRequest, UserRecord } from '../../src/lib/types';
import { PLAN_LIMITS } from '../../src/lib/planLimits';
import {
  getUserFromDB,
  createUserInDB,
  resetMonthlyUsageIfNeeded,
  checkTrialExpired,
} from '../lib/usageStorage';

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

    // Load user from database (with cache)
    console.log(`[Auth] Loading user from DB: ${clerkUserId}`);
    let userRecord = await getUserFromDB(clerkUserId);
    console.log(`[Auth] getUserFromDB result: ${userRecord ? 'FOUND' : 'NOT FOUND'}`);

    if (!userRecord) {
      // First-time user: create in database
      console.log(`[Auth] ⚠️  First-time user, creating record...`);
      try {
        userRecord = await createUserInDB(clerkUserId, decoded.email || '');
        console.log(`[Auth] ✓ User record created: plan=${userRecord.plan}, id=${userRecord.userId.substring(0, 20)}...`);
      } catch (createErr) {
        console.error(`[Auth] ❌ Failed to create user: ${createErr.message}`);
        throw createErr;
      }
    } else {
      console.log(`[Auth] ✓ Existing user found: email=${userRecord.email || '(no email)'}, plan=${userRecord.plan}`);
      // Check if user's trial has expired
      if (userRecord.plan === 'free' && checkTrialExpired(userRecord)) {
        console.log(`[Auth] ✗ Trial expired for user: ${userRecord.email}`);
        res.status(402).json({
          error: 'Free trial expired',
          action: 'upgrade',
          message: 'Your 7-day trial has ended. Please upgrade to continue.',
        });
        return;
      }
    }

    // Attach user info to request
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
      // User object in-memory was updated; no need to call saveUsers() since we're async
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
