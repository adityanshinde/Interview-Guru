import { useAuth } from '@clerk/react';
import { useEffect, useState, useCallback } from 'react';
import { PlanTier } from '../lib/planLimits';
import { API_ENDPOINT } from '../config';

export interface UsageQuota {
  voiceMinutes: { used: number; limit: number; remaining: number; percentUsed: number };
  chatMessages: { used: number; limit: number; remaining: number; percentUsed: number };
  sessions: { used: number; limit: number; remaining: number; percentUsed: number };
}

export interface PlanStatus {
  plan: PlanTier;
  quotas: UsageQuota;
  trialDaysRemaining: number;
  features: Record<string, boolean>;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function usePlanStatus(): PlanStatus {
  const { getToken } = useAuth();
  const [status, setStatus] = useState<PlanStatus>({
    plan: 'free',
    quotas: {
      voiceMinutes: { used: 0, limit: 10, remaining: 10, percentUsed: 0 },
      chatMessages: { used: 0, limit: 10, remaining: 10, percentUsed: 0 },
      sessions: { used: 0, limit: 1, remaining: 1, percentUsed: 0 },
    },
    trialDaysRemaining: 7,
    features: {},
    loading: true,
    error: null,
    refetch: async () => {},
  });

  const fetchPlanStatus = useCallback(async () => {
    try {
      const token = await getToken();

      // Add timestamp to query string to force fresh data (cache-busting)
      const timestamp = new Date().getTime();
      const response = await fetch(API_ENDPOINT(`/api/usage?t=${timestamp}`), {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
        },
      });

      if (response.status === 402) {
        const data = await response.json();
        setStatus(prev => ({ ...prev, error: data.message, loading: false }));
        return;
      }

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();
      setStatus(prev => ({
        ...prev,
        plan: data.user.plan,
        quotas: data.quotas,
        trialDaysRemaining: data.trialDaysRemaining,
        features: data.features,
        loading: false,
        error: null,
        refetch: prev.refetch,
      }));
    } catch (err) {
      setStatus(prev => ({
        ...prev,
        error: err instanceof Error ? err.message : 'Failed to load plan status',
        loading: false,
        refetch: prev.refetch,
      }));
    }
  }, [getToken]);

  useEffect(() => {
    // Set the refetch function in state so it can be called from outside
    setStatus(prev => ({ ...prev, refetch: fetchPlanStatus }));
    
    // Initial fetch
    fetchPlanStatus();

    // Refresh plan status every 60 seconds
    const interval = setInterval(fetchPlanStatus, 60000);
    return () => clearInterval(interval);
  }, [fetchPlanStatus]);

  return status;
}
