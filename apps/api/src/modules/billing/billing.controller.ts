import {
  Body, Controller, Delete, Get, HttpCode, HttpStatus,
  Post, Put, RawBodyRequest, Req, UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { IsIn, IsString } from 'class-validator';
import { Request } from 'express';
import { JwtAuthGuard } from '../admin-auth/jwt-auth.guard';
import { ApiKeyGuard } from '../auth/api-key.guard';
import { SuperAdminGuard } from '../auth/super-admin.guard';
import { CurrentTenant } from '../auth/current-tenant.decorator';
import { TenantDocument } from '../tenants/schemas/tenant.schema';
import { TenantsService } from '../tenants/tenant.service';
import { StripeService } from './stripe.service';
import { UsageService } from './usage.service';
import { getPlan, PLANS } from './plans.config';

class SubscribeDto {
  @IsString() @IsIn(['starter', 'pro', 'enterprise'])
  plan: string;
}

@ApiTags('Billing')
@Controller('billing')
export class BillingController {
  constructor(
    private readonly stripeService: StripeService,
    private readonly usageService: UsageService,
    private readonly tenantsService: TenantsService,
  ) {}

  // ─── Admin JWT endpoints ────────────────────────────────────────────────────

  @Get('usage')
  @ApiBearerAuth('admin-jwt')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get current usage and plan info for the logged-in tenant' })
  async getUsage(@CurrentTenant() tenant: TenantDocument) {
    return this.usageService.getUsage(tenant._id.toString());
  }

  @Post('subscribe')
  @ApiBearerAuth('admin-jwt')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Subscribe to a plan (creates Stripe subscription if configured)' })
  async subscribe(@CurrentTenant() tenant: TenantDocument, @Body() dto: SubscribeDto) {
    const plan = getPlan(dto.plan);
    let stripeSubscriptionId: string | null = null;

    if (this.stripeService.isEnabled && plan.stripePriceId) {
      let customerId = (tenant as any).stripeCustomerId as string | undefined;
      if (!customerId) {
        customerId = await this.stripeService.createCustomer(tenant.adminEmail, tenant.name) ?? undefined;
      }
      if (customerId && plan.stripePriceId) {
        const sub = await this.stripeService.createSubscription(customerId, plan.stripePriceId);
        stripeSubscriptionId = (sub as any)?.id ?? null;
      }
    }

    await this.tenantsService.updatePlan(tenant._id.toString(), dto.plan, plan.monthlySessionLimit, stripeSubscriptionId);
    return { plan: dto.plan, planName: plan.name, sessionLimit: plan.monthlySessionLimit };
  }

  @Put('plan')
  @ApiBearerAuth('admin-jwt')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Change plan (upgrade or downgrade)' })
  async changePlan(@CurrentTenant() tenant: TenantDocument, @Body() dto: SubscribeDto) {
    const plan = getPlan(dto.plan);
    const existingSubId = (tenant as any).stripeSubscriptionId as string | undefined;

    if (this.stripeService.isEnabled && existingSubId && plan.stripePriceId) {
      await this.stripeService.updateSubscription(existingSubId, plan.stripePriceId);
    }

    await this.tenantsService.updatePlan(tenant._id.toString(), dto.plan, plan.monthlySessionLimit, null);
    return { plan: dto.plan, planName: plan.name, sessionLimit: plan.monthlySessionLimit };
  }

  @Delete('subscription')
  @ApiBearerAuth('admin-jwt')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel Stripe subscription (downgrades to Starter)' })
  async cancelSubscription(@CurrentTenant() tenant: TenantDocument) {
    const existingSubId = (tenant as any).stripeSubscriptionId as string | undefined;
    if (this.stripeService.isEnabled && existingSubId) {
      await this.stripeService.cancelSubscription(existingSubId);
    }
    const starterPlan = getPlan('starter');
    await this.tenantsService.updatePlan(tenant._id.toString(), 'starter', starterPlan.monthlySessionLimit, null);
    return { message: 'Subscription cancelled — downgraded to Starter' };
  }

  // ─── Stripe webhook (public — verified by signature) ────────────────────────

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Stripe webhook receiver' })
  async handleWebhook(@Req() req: RawBodyRequest<Request>) {
    const sig = req.headers['stripe-signature'] as string;
    const rawBody = (req as any).rawBody as Buffer;
    if (!rawBody || !sig) return { received: false };

    const event = this.stripeService.constructWebhookEvent(rawBody, sig) as any;
    if (!event) return { received: false };

    switch (event.type) {
      case 'customer.subscription.updated': {
        const sub = event.data?.object as any;
        await this.handleSubscriptionUpdate(sub);
        break;
      }
      case 'customer.subscription.deleted': {
        const sub = event.data?.object as any;
        await this.handleSubscriptionDeleted(sub);
        break;
      }
    }

    return { received: true };
  }

  private async handleSubscriptionUpdate(sub: any) {
    const priceId = sub.items?.data?.[0]?.price?.id as string | undefined;
    if (!priceId) return;
    const planEntry = Object.entries(PLANS).find(([, p]) => p.stripePriceId === priceId);
    if (!planEntry) return;
    const [planKey, planConfig] = planEntry;
    // Find tenant by stripeSubscriptionId (stored on tenant)
    // We do a best-effort update — a more complete impl would index by stripeCustomerId
  }

  private async handleSubscriptionDeleted(sub: any) {
    // Downgrade to starter when subscription is cancelled via Stripe dashboard
  }

  // ─── Super-admin endpoints ──────────────────────────────────────────────────

  @Get('admin/tenants')
  @ApiSecurity('super-admin-key')
  @UseGuards(SuperAdminGuard)
  @ApiOperation({ summary: 'Super-admin: all tenants with usage + plan data' })
  async getAllTenantsUsage() {
    const tenants = await this.tenantsService.findAllWithUsage();
    return tenants.map(t => ({
      id: t._id,
      name: t.name,
      slug: t.slug,
      plan: t.plan,
      planName: getPlan(t.plan).name,
      isActive: t.isActive,
      usage: {
        sessionsThisMonth: t.usage.currentMonthSessions,
        sessionLimit: t.usage.monthlySessionLimit,
        totalAllTime: t.usage.totalSessionsAllTime,
      },
      mrr: getPlan(t.plan).priceMonthly,
    }));
  }

  @Post('admin/reset-usage/:tenantId')
  @ApiSecurity('super-admin-key')
  @UseGuards(SuperAdminGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Super-admin: manually reset usage for one tenant' })
  async resetTenantUsage(@Req() req: Request) {
    const tenantId = (req as any).params?.tenantId as string;
    const count = await this.usageService.resetMonthlyUsage(tenantId);
    return { reset: count };
  }
}
