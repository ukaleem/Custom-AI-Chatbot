import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import {
  AttractionCategory,
  FoodStyle,
  ICoordinates,
  IMultiLangText,
  IOpeningHours,
  PriceRange,
} from '@custom-ai-chatbot/shared-types';

export type AttractionDocument = HydratedDocument<Attraction>;

const MultiLangTextSchema = {
  en: { type: String, required: true },
  it: { type: String },
  de: { type: String },
  fr: { type: String },
  es: { type: String },
};

const OpeningHoursSchema = {
  monday: { type: String },
  tuesday: { type: String },
  wednesday: { type: String },
  thursday: { type: String },
  friday: { type: String },
  saturday: { type: String },
  sunday: { type: String },
};

@Schema({ timestamps: true })
export class Attraction {
  @Prop({ required: true, index: true })
  tenantId: string;

  @Prop({ trim: true })
  externalId?: string;

  @Prop({ type: MultiLangTextSchema, required: true })
  name: IMultiLangText;

  @Prop({ type: MultiLangTextSchema, required: true })
  description: IMultiLangText;

  @Prop({ type: MultiLangTextSchema, required: true })
  shortDescription: IMultiLangText;

  @Prop({
    required: true,
    enum: ['culture', 'entertainment', 'city-tour', 'food', 'transport', 'children', 'healthcare', 'safety', 'shopping', 'nature'],
  })
  category: AttractionCategory;

  @Prop({ type: [String], default: [] })
  tags: string[];

  @Prop({ required: true })
  address: string;

  @Prop({
    type: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
    },
    required: true,
  })
  location: ICoordinates;

  @Prop({ type: OpeningHoursSchema })
  openingHours?: IOpeningHours;

  @Prop({ enum: ['free', 'budget', 'mid-range', 'expensive'] })
  priceRange?: PriceRange;

  @Prop({ enum: ['sitting', 'walking', 'both'] })
  foodStyle?: FoodStyle;

  @Prop({ min: 0 })
  durationMinutes?: number;

  @Prop()
  imageUrl?: string;

  @Prop()
  websiteUrl?: string;

  @Prop()
  phoneNumber?: string;

  @Prop({ default: true })
  isActive: boolean;
}

export const AttractionSchema = SchemaFactory.createForClass(Attraction);

AttractionSchema.index({ tenantId: 1, category: 1 });
AttractionSchema.index({ tenantId: 1, isActive: 1 });
