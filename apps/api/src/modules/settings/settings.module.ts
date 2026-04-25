import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Tenant, TenantSchema } from '../tenants/schemas/tenant.schema';
import { AdminAuthModule } from '../admin-auth/admin-auth.module';
import { SettingsController } from './settings.controller';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Tenant.name, schema: TenantSchema }]),
    AdminAuthModule,
  ],
  controllers: [SettingsController],
})
export class SettingsModule {}
