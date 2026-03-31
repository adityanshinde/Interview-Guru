import { UserRecord } from '../types/index.js';

/**
 * In-Memory User Cache
 * Caches user records for fast reads, syncs back to Neon
 */

let userCache = new Map<string, UserRecord>();
let lastSyncTime = new Map<string, number>();

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes - refresh from DB after this

export function getFromCache(userId: string): UserRecord | null {
  const cached = userCache.get(userId);
  
  if (!cached) return null;
  
  // Check if cache is stale
  const lastSync = lastSyncTime.get(userId) || 0;
  const isStale = Date.now() - lastSync > CACHE_TTL;
  
  if (isStale) {
    // Cache is old, should refresh from DB
    console.log(`[Cache] TTL expired for user ${userId.substring(0, 20)}... (${Math.round((Date.now() - lastSync) / 1000)}s old)`);
    return null;
  }
  
  return cached;
}

export function setInCache(userId: string, user: UserRecord): void {
  userCache.set(userId, { ...user }); // Deep copy
  lastSyncTime.set(userId, Date.now());
  console.log(`[Cache] ✓ Cached user ${userId.substring(0, 20)}...`);
}

export function invalidateCache(userId: string): void {
  userCache.delete(userId);
  lastSyncTime.delete(userId);
  console.log(`[Cache] Invalidated user ${userId.substring(0, 20)}...`);
}

export function getStat() {
  return {
    cachedUsers: userCache.size,
    cacheSize: Array.from(userCache.values()).reduce((size, user) => size + JSON.stringify(user).length, 0),
  };
}
