import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { UsageService } from './usage.service';

@Injectable()
export class BillingCron {
  private readonly logger = new Logger(BillingCron.name);

  constructor(private readonly usageService: UsageService) {}

  // Runs at midnight on the 1st of every month
  @Cron(CronExpression.EVERY_1ST_DAY_OF_MONTH_AT_MIDNIGHT)
  async resetMonthlyUsage() {
    this.logger.log('Monthly usage reset starting…');
    const count = await this.usageService.resetMonthlyUsage();
    this.logger.log(`Monthly usage reset complete — ${count} tenants reset`);
  }
}
