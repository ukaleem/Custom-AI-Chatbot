import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type KnowledgeItemDocument = HydratedDocument<KnowledgeItem>;

@Schema({ timestamps: true, collection: 'knowledgeitems' })
export class KnowledgeItem {
  @Prop({ required: true, index: true })
  tenantId: string;

  /** Primary label — used as the bot's answer heading */
  @Prop({ required: true, trim: true })
  title: string;

  /** Full content the bot can use for answers */
  @Prop({ required: true })
  content: string;

  /** One-sentence summary for the bot's quick overview */
  @Prop({ default: '' })
  summary: string;

  /** Free-form category — company decides their own taxonomy */
  @Prop({ default: 'general', trim: true })
  category: string;

  @Prop({ type: [String], default: [] })
  tags: string[];

  /** Any extra structured fields from the source data */
  @Prop({ type: Object, default: {} })
  metadata: Record<string, unknown>;

  /** Where this item came from */
  @Prop({ default: 'manual', enum: ['manual', 'csv', 'sql', 'json', 'api'] })
  source: string;

  @Prop({ default: true })
  isActive: boolean;
}

export const KnowledgeItemSchema = SchemaFactory.createForClass(KnowledgeItem);

KnowledgeItemSchema.index({ tenantId: 1, category: 1 });
KnowledgeItemSchema.index({ tenantId: 1, isActive: 1 });
KnowledgeItemSchema.index({ tenantId: 1, title: 'text', content: 'text' });
