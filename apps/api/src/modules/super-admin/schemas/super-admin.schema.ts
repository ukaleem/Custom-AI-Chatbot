import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type SuperAdminDocument = HydratedDocument<SuperAdmin>;

@Schema({ timestamps: true })
export class SuperAdmin {
  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email: string;

  @Prop({ required: true })
  passwordHash: string;

  @Prop({ default: 'Kaleem Ullah' })
  name: string;
}

export const SuperAdminSchema = SchemaFactory.createForClass(SuperAdmin);
