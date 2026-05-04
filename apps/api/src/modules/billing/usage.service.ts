import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Tenant, TenantDocument } from '../tenants/schemas/tenant.schema';
import { getPlan } from './plans.config';

@Injectable()
export class UsageService {
  constructor(
    @InjectModel(Tenant.name) private readonly tenantModel: Model<TenantDocument>,
  ) {}

  async getUsage(tenantId: string) {
    const tenant = await this.tenantModel.findById(tenantId).exec();
    if (!tenant) return null;

    const plan = getPlan(tenant.plan);
    const { currentMonthSessions, monthlySessionLimit, totalSessionsAllTime, currentMonthMessages } = tenant.usage;

    return {
      plan: tenant.plan,
      planName: plan.name,
      priceMonthly: plan.priceMonthly,
      sessions: {
        used: currentMonthSessions,
        limit: monthlySessionLimit,
        remaining: Math.max(0, monthlySessionLimit - currentMonthSessions),
        percentUsed: monthlySessionLimit > 0
          ? Math.round((currentMonthSessions / monthlySessionLimit) * 100)
          : 0,
        unlimited: monthlySessionLimit >= 999999,
      },
      messages: { thisMonth: currentMonthMessages },
      allTime: { totalSessions: totalSessionsAllTime },
      resetDate: tenant.usage.billingResetDate,
      features: {
        supportedLanguages: plan.supportedLanguages,
        analyticsAccess: plan.analyticsAccess,
        customBranding: plan.customBranding,
      },
    };
  }

  async incrementMessage(tenantId: string): Promise<void> {
    await this.tenantModel
      .findByIdAndUpdate(tenantId, { $inc: { 'usage.currentMonthMessages': 1 } })
      .exec();
  }

  async resetMonthlyUsage(tenantId?: string): Promise<number> {
    const filter = tenantId ? { _id: new Types.ObjectId(tenantId) } : {};
    const result = await this.tenantModel.updateMany(filter, {
      $set: {
        'usage.currentMonthSessions': 0,
        'usage.currentMonthMessages': 0,
        'usage.billingResetDate': new Date(),
      },
    }).exec();
    return result.modifiedCount;
  }

  async isOverLimit(tenantId: string): Promise<boolean> {
    const tenant = await this.tenantModel.findById(tenantId).exec();
    if (!tenant) return false;
    const { currentMonthSessions, monthlySessionLimit } = tenant.usage;
    return monthlySessionLimit < 999999 && currentMonthSessions >= monthlySessionLimit;
  }
}
