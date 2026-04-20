export type TenantPlan = 'starter' | 'pro' | 'enterprise';

export type SupportedLanguage = 'en' | 'it' | 'de' | 'fr' | 'es';

export interface IBotConfig {
  botName: string;
  greeting: string;
  primaryColor: string;
  logoUrl: string;
  defaultLanguage: SupportedLanguage;
  supportedLanguages: SupportedLanguage[];
}

export interface ITenantUsage {
  monthlySessionLimit: number;
  currentMonthSessions: number;
  totalSessionsAllTime: number;
  currentMonthMessages: number;
  billingResetDate: Date;
}

export interface ITenant {
  id: string;
  name: string;
  slug: string;
  apiKey: string;
  adminEmail: string;
  plan: TenantPlan;
  isActive: boolean;
  botConfig: IBotConfig;
  usage: ITenantUsage;
  createdAt: Date;
  updatedAt: Date;
}

export const PLAN_LIMITS: Record<TenantPlan, number> = {
  starter: 500,
  pro: 5000,
  enterprise: Infinity,
};
