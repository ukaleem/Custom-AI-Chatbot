export interface PlanConfig {
  name: string;
  monthlySessionLimit: number;
  supportedLanguages: string[];
  analyticsAccess: 'basic' | 'full';
  customBranding: boolean;
  priceMonthly: number;
  stripePriceId: string | null;
}

export const PLANS: Record<string, PlanConfig> = {
  starter: {
    name: 'Starter',
    monthlySessionLimit: 500,
    supportedLanguages: ['en', 'it'],
    analyticsAccess: 'basic',
    customBranding: false,
    priceMonthly: 49,
    stripePriceId: process.env.STRIPE_PRICE_STARTER ?? null,
  },
  pro: {
    name: 'Pro',
    monthlySessionLimit: 5000,
    supportedLanguages: ['en', 'it', 'de', 'fr', 'es'],
    analyticsAccess: 'full',
    customBranding: true,
    priceMonthly: 149,
    stripePriceId: process.env.STRIPE_PRICE_PRO ?? null,
  },
  enterprise: {
    name: 'Enterprise',
    monthlySessionLimit: 999999,
    supportedLanguages: ['en', 'it', 'de', 'fr', 'es'],
    analyticsAccess: 'full',
    customBranding: true,
    priceMonthly: 0,
    stripePriceId: process.env.STRIPE_PRICE_ENTERPRISE ?? null,
  },
};

export function getPlan(planKey: string): PlanConfig {
  return PLANS[planKey] ?? PLANS['starter'];
}
