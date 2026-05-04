import {
  Body, Controller, Get, HttpCode, HttpStatus,
  Param, Patch, Post, Put, Request, UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsEmail, IsIn, IsOptional, IsString, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SuperAdminService } from './super-admin.service';
import { SuperAdminJwtGuard } from './super-admin-jwt.guard';
import { SuperAdminLoginDto, ChangePasswordDto } from './dto/super-admin-login.dto';
import { TenantsService } from '../tenants/tenant.service';
import { getPlan, PLANS } from '../billing/plans.config';
import { CreateTenantDto } from '../tenants/dto/create-tenant.dto';

class OverridePlanDto {
  @ApiProperty({ enum: ['starter', 'pro', 'enterprise'] })
  @IsIn(['starter', 'pro', 'enterprise'])
  plan: string;

  @ApiPropertyOptional({ description: 'Custom session limit override (leave empty to use plan default)' })
  @IsOptional()
  sessionLimit?: number;
}

class SetPasswordForTenantDto {
  @ApiProperty()
  @IsString() @MinLength(8)
  password: string;
}

@ApiTags('Super Admin Portal')
@Controller('super-admin')
export class SuperAdminController {
  constructor(
    private readonly superAdminService: SuperAdminService,
    private readonly tenantsService: TenantsService,
  ) {}

  // ─── Auth ─────────────────────────────────────────────────────────────────

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Super-admin login (email + password → JWT)' })
  login(@Body() dto: SuperAdminLoginDto) {
    return this.superAdminService.login(dto.email, dto.password);
  }

  @Get('me')
  @UseGuards(SuperAdminJwtGuard)
  @ApiBearerAuth('super-admin-jwt')
  getMe(@Request() req: any) {
    return { name: req.user.name, email: req.user.email };
  }

  @Put('password')
  @HttpCode(HttpStatus.OK)
  @UseGuards(SuperAdminJwtGuard)
  @ApiBearerAuth('super-admin-jwt')
  @ApiOperation({ summary: 'Change super-admin password' })
  async changePassword(@Request() req: any, @Body() dto: ChangePasswordDto) {
    await this.superAdminService.changePassword(req.user.email, dto.currentPassword, dto.newPassword);
    return { message: 'Password updated successfully' };
  }

  // ─── Tenants ──────────────────────────────────────────────────────────────

  @Get('tenants')
  @UseGuards(SuperAdminJwtGuard)
  @ApiBearerAuth('super-admin-jwt')
  @ApiOperation({ summary: 'All tenants — with usage, plan, revenue' })
  async getTenants() {
    const tenants = await this.tenantsService.findAllWithUsage();
    return tenants.map(t => ({
      id: t._id,
      name: t.name,
      slug: t.slug,
      adminEmail: t.adminEmail,
      plan: t.plan,
      planName: getPlan(t.plan).name,
      isActive: t.isActive,
      createdAt: (t as any).createdAt,
      usage: {
        sessionsThisMonth: t.usage.currentMonthSessions,
        sessionLimit: t.usage.monthlySessionLimit,
        totalAllTime: t.usage.totalSessionsAllTime,
        messagesThisMonth: t.usage.currentMonthMessages,
        resetDate: t.usage.billingResetDate,
      },
      mrr: getPlan(t.plan).priceMonthly,
    }));
  }

  @Post('tenants')
  @UseGuards(SuperAdminJwtGuard)
  @ApiBearerAuth('super-admin-jwt')
  @ApiOperation({ summary: 'Create a new tenant company directly from super-admin portal' })
  createTenant(@Body() dto: CreateTenantDto) {
    return this.tenantsService.create(dto);
  }

  @Patch('tenants/:id/status')
  @HttpCode(HttpStatus.OK)
  @UseGuards(SuperAdminJwtGuard)
  @ApiBearerAuth('super-admin-jwt')
  @ApiOperation({ summary: 'Activate or deactivate a tenant — immediately blocks/unblocks their chatbot' })
  async setTenantStatus(@Param('id') id: string, @Body() body: { isActive: boolean }) {
    await this.tenantsService.setActiveStatus(id, body.isActive);
    return { message: body.isActive ? 'Tenant activated' : 'Tenant deactivated', isActive: body.isActive };
  }

  @Put('tenants/:id/plan')
  @HttpCode(HttpStatus.OK)
  @UseGuards(SuperAdminJwtGuard)
  @ApiBearerAuth('super-admin-jwt')
  @ApiOperation({ summary: 'Override tenant plan — super-admin can assign any plan with custom limits' })
  async overridePlan(@Param('id') id: string, @Body() dto: OverridePlanDto) {
    const plan = getPlan(dto.plan);
    const limit = dto.sessionLimit ?? plan.monthlySessionLimit;
    await this.tenantsService.updatePlan(id, dto.plan, limit, null);
    return { message: `Plan updated to ${plan.name}`, plan: dto.plan, sessionLimit: limit };
  }

  @Post('tenants/:id/set-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(SuperAdminJwtGuard)
  @ApiBearerAuth('super-admin-jwt')
  @ApiOperation({ summary: 'Set admin dashboard password for a tenant' })
  async setTenantPassword(@Param('id') id: string, @Body() dto: SetPasswordForTenantDto) {
    await this.tenantsService.setAdminPassword(id, dto.password);
  }

  @Post('tenants/:id/reset-usage')
  @HttpCode(HttpStatus.OK)
  @UseGuards(SuperAdminJwtGuard)
  @ApiBearerAuth('super-admin-jwt')
  @ApiOperation({ summary: 'Reset monthly usage counters for a specific tenant' })
  async resetTenantUsage(@Param('id') id: string) {
    const Tenant = (this.tenantsService as any).tenantModel;
    await Tenant.findByIdAndUpdate(id, {
      $set: { 'usage.currentMonthSessions': 0, 'usage.currentMonthMessages': 0, 'usage.billingResetDate': new Date() },
    }).exec();
    return { message: 'Usage reset' };
  }

  // ─── Global Analytics ─────────────────────────────────────────────────────

  @Get('analytics')
  @UseGuards(SuperAdminJwtGuard)
  @ApiBearerAuth('super-admin-jwt')
  @ApiOperation({ summary: 'Global platform analytics — sessions, messages, top tenants' })
  async getGlobalAnalytics() {
    const tenants = await this.tenantsService.findAllWithUsage();
    const totalSessions = tenants.reduce((s, t) => s + t.usage.totalSessionsAllTime, 0);
    const totalMessagesMonth = tenants.reduce((s, t) => s + t.usage.currentMonthMessages, 0);
    const activeTenants = tenants.filter(t => t.isActive).length;
    const mrr = tenants.filter(t => t.isActive).reduce((s, t) => s + getPlan(t.plan).priceMonthly, 0);

    const planBreakdown: Record<string, number> = {};
    for (const t of tenants) {
      planBreakdown[t.plan] = (planBreakdown[t.plan] ?? 0) + 1;
    }

    const topByUsage = [...tenants]
      .sort((a, b) => b.usage.totalSessionsAllTime - a.usage.totalSessionsAllTime)
      .slice(0, 5)
      .map(t => ({ name: t.name, slug: t.slug, sessions: t.usage.totalSessionsAllTime, plan: t.plan }));

    return {
      overview: {
        totalTenants: tenants.length,
        activeTenants,
        inactiveTenants: tenants.length - activeTenants,
        mrr,
      },
      usage: {
        totalSessionsAllTime: totalSessions,
        messagesThisMonth: totalMessagesMonth,
      },
      planBreakdown,
      topTenantsByUsage: topByUsage,
      plans: Object.entries(PLANS).map(([key, p]) => ({
        key,
        name: p.name,
        priceMonthly: p.priceMonthly,
        count: planBreakdown[key] ?? 0,
        revenue: (planBreakdown[key] ?? 0) * p.priceMonthly,
      })),
    };
  }
}
