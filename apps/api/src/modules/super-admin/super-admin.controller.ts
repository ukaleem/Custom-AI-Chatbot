import {
  Body, Controller, Get, HttpCode, HttpStatus,
  Post, Put, Request, UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SuperAdminService } from './super-admin.service';
import { SuperAdminJwtGuard } from './super-admin-jwt.guard';
import { SuperAdminLoginDto, ChangePasswordDto } from './dto/super-admin-login.dto';
import { TenantsService } from '../tenants/tenant.service';
import { getPlan } from '../billing/plans.config';

@ApiTags('Super Admin Portal')
@Controller('super-admin')
export class SuperAdminController {
  constructor(
    private readonly superAdminService: SuperAdminService,
    private readonly tenantsService: TenantsService,
  ) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Super-admin login — email + password → JWT' })
  login(@Body() dto: SuperAdminLoginDto) {
    return this.superAdminService.login(dto.email, dto.password);
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

  @Get('me')
  @UseGuards(SuperAdminJwtGuard)
  @ApiBearerAuth('super-admin-jwt')
  @ApiOperation({ summary: 'Get current super-admin profile' })
  getMe(@Request() req: any) {
    return { name: req.user.name, email: req.user.email };
  }

  @Get('tenants')
  @UseGuards(SuperAdminJwtGuard)
  @ApiBearerAuth('super-admin-jwt')
  @ApiOperation({ summary: 'List all tenants with usage and revenue' })
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
}
