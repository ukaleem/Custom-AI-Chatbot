import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type TenantDocument = HydratedDocument<Tenant>;

@Schema({ timestamps: true })
export class Tenant {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  slug: string;

  @Prop({ required: true, unique: true, index: true })
  apiKey: string;

  @Prop({ required: true, lowercase: true, trim: true })
  adminEmail: string;

  @Prop({ default: 'starter', enum: ['starter', 'pro', 'enterprise'] })
  plan: string;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({
    type: {
      botName: { type: String, default: 'Guide' },
      greeting: { type: String, default: 'Hello! I\'m your AI tourist guide. How can I help you today?' },
      primaryColor: { type: String, default: '#2563EB' },
      logoUrl: { type: String, default: '' },
      defaultLanguage: { type: String, default: 'en' },
      supportedLanguages: { type: [String], default: ['en', 'it'] },
    },
    default: {},
  })
  botConfig: {
    botName: string;
    greeting: string;
    primaryColor: string;
    logoUrl: string;
    defaultLanguage: string;
    supportedLanguages: string[];
  };

  @Prop({
    type: {
      provider: { type: String, enum: ['openai', 'anthropic', 'gemini', 'mistral'], default: 'openai' },
      apiKey: { type: String, default: '' },
      model: { type: String, default: '' },
      embeddingModel: { type: String, default: 'text-embedding-3-small' },
    },
    default: {},
    select: false,
  })
  llmConfig: {
    provider: 'openai' | 'anthropic' | 'gemini' | 'mistral';
    apiKey: string;
    model: string;
    embeddingModel: string;
  };

  @Prop({
    type: {
      monthlySessionLimit: { type: Number, default: 500 },
      currentMonthSessions: { type: Number, default: 0 },
      totalSessionsAllTime: { type: Number, default: 0 },
      currentMonthMessages: { type: Number, default: 0 },
      billingResetDate: { type: Date, default: () => new Date() },
    },
    default: {},
  })
  usage: {
    monthlySessionLimit: number;
    currentMonthSessions: number;
    totalSessionsAllTime: number;
    currentMonthMessages: number;
    billingResetDate: Date;
  };
}

export const TenantSchema = SchemaFactory.createForClass(Tenant);

TenantSchema.index({ apiKey: 1 }, { unique: true });
TenantSchema.index({ slug: 1 }, { unique: true });
