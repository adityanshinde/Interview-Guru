export type PlanTier = 'free' | 'basic' | 'pro' | 'enterprise';

export interface PlanConfig {
  name: string;
  price: number | null;
  currency: string;
  billingPeriod: 'one-time' | 'month' | 'year';
  trialDays?: number;
  voiceMinutesPerMonth: number;
  chatMessagesPerMonth: number;
  sessionsPerMonth: number;
  features: Record<string, boolean>;
  notes: string;
}

export const PLAN_LIMITS: Record<PlanTier, PlanConfig> = {
  free: {
    name: 'Free Trial',
    price: 0,
    currency: 'USD',
    billingPeriod: 'one-time',
    trialDays: 7,
    voiceMinutesPerMonth: 20,
    chatMessagesPerMonth: 20,
    sessionsPerMonth: 1,
    features: {
      textToSpeech: false,
      sessionExport: false,
      customPersonas: false,
      cacheGeneration: false,
      advancedAnalytics: false,
    },
    notes: '7-day free trial, then upgrade required',
  },

  basic: {
    name: 'Basic',
    price: 9.99,
    currency: 'USD',
    billingPeriod: 'month',
    voiceMinutesPerMonth: 60,
    chatMessagesPerMonth: 500,
    sessionsPerMonth: 1,
    features: {
      textToSpeech: true,
      sessionExport: false,
      customPersonas: false,
      cacheGeneration: true,
      advancedAnalytics: false,
    },
    notes: 'Essential for regular interview prep',
  },

  pro: {
    name: 'Professional',
    price: 29.99,
    currency: 'USD',
    billingPeriod: 'month',
    voiceMinutesPerMonth: 600,
    chatMessagesPerMonth: 5000,
    sessionsPerMonth: 10,
    features: {
      textToSpeech: true,
      sessionExport: true,
      customPersonas: true,
      cacheGeneration: true,
      advancedAnalytics: true,
    },
    notes: 'For power users prepping for multiple interviews',
  },

  enterprise: {
    name: 'Enterprise',
    price: null,
    currency: 'USD',
    billingPeriod: 'year',
    voiceMinutesPerMonth: 99999,
    chatMessagesPerMonth: 99999,
    sessionsPerMonth: 99999,
    features: {
      textToSpeech: true,
      sessionExport: true,
      customPersonas: true,
      cacheGeneration: true,
      advancedAnalytics: true,
    },
    notes: 'Custom terms, dedicated support',
  },
};