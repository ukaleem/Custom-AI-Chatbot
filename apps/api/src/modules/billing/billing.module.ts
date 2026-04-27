import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { MongooseModule } from '@nestjs/mongoose';
import { Tenant, TenantSchema } from '../tenants/schemas/tenant.schema';
import { TenantsModule } from '../tenants/tenant.module';
import { AdminAuthModule } from '../admin-auth/admin-auth.module';
import { AuthModule } from '../auth/auth.module';
import { StripeService } from './stripe.service';
import { UsageService } from './usage.service';
import { BillingController } from './billing.controller';
import { BillingCron } from './billing.cron';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    MongooseModule.forFeature([{ name: Tenant.name, schema: TenantSchema }]),
    TenantsModule,
    AdminAuthModule,
    AuthModule,
  ],
  providers: [StripeService, UsageService, BillingCron],
  controllers: [BillingController],
  exports: [UsageService, StripeService],
})
export class BillingModule {}
