import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type ConversationDocument = HydratedDocument<Conversation>;

@Schema({ _id: false })
export class QuickReply {
  @Prop({ required: true }) label: string;
  @Prop({ required: true }) value: string;
}

@Schema({ _id: false })
export class Message {
  @Prop({ required: true, enum: ['user', 'assistant'] }) role: string;
  @Prop({ required: true }) content: string;
  @Prop({ type: [QuickReply], default: [] }) quickReplies: QuickReply[];
  @Prop({ default: () => new Date() }) timestamp: Date;
  // Token tracking
  @Prop({ default: 0 }) inputTokens: number;
  @Prop({ default: 0 }) outputTokens: number;
  @Prop({ default: '' }) modelUsed: string;
  @Prop({ default: 0 }) latencyMs: number;
}

@Schema({ timestamps: true })
export class Conversation {
  @Prop({ required: true, unique: true, index: true })
  sessionId: string;

  @Prop({ required: true, type: Types.ObjectId, index: true })
  tenantId: Types.ObjectId;

  @Prop({ default: 'GREETING' })
  currentState: string;

  @Prop({ default: 'en' })
  language: string;

  @Prop({
    type: { availableHours: Number, preference: String, wantsFood: Boolean, foodStyle: String },
    default: {},
  })
  collectedParams: {
    availableHours?: number;
    preference?: string;
    wantsFood?: boolean;
    foodStyle?: string;
  };

  @Prop({ type: [Message], default: [] })
  messages: Message[];

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: () => new Date() })
  lastMessageAt: Date;

  @Prop({ default: () => new Date(Date.now() + 24 * 60 * 60 * 1000) })
  expiresAt: Date;

  // Conversation-level token aggregates (updated on each message save)
  @Prop({ default: 0 }) totalInputTokens: number;
  @Prop({ default: 0 }) totalOutputTokens: number;
  @Prop({ default: '' }) modelUsed: string;
}

export const ConversationSchema = SchemaFactory.createForClass(Conversation);

ConversationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
ConversationSchema.index({ tenantId: 1, createdAt: -1 });
ConversationSchema.index({ tenantId: 1, modelUsed: 1 });
