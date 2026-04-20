import { Module } from '@nestjs/common';
import { SuperAdminGuard } from './super-admin.guard';

@Module({
  providers: [SuperAdminGuard],
  exports: [SuperAdminGuard],
})
export class AuthModule {}
