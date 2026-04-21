import { Module } from '@nestjs/common';
import { SuperAdminGuard } from './super-admin.guard';
import { ApiKeyGuard } from './api-key.guard';
import { TenantsModule } from '../tenants/tenant.module';

@Module({
  imports: [TenantsModule],
  providers: [SuperAdminGuard, ApiKeyGuard],
  exports: [SuperAdminGuard, ApiKeyGuard],
})
export class AuthModule {}
