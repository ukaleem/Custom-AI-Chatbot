import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SuperAdminGuard } from './super-admin.guard';
import { ApiKeyGuard } from './api-key.guard';
import { Tenant, TenantSchema } from '../tenants/schemas/tenant.schema';

@Module({
  imports: [MongooseModule.forFeature([{ name: Tenant.name, schema: TenantSchema }])],
  providers: [SuperAdminGuard, ApiKeyGuard],
  exports: [SuperAdminGuard, ApiKeyGuard, MongooseModule],
})
export class AuthModule {}
