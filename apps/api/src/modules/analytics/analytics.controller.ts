import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../admin-auth/jwt-auth.guard';
import { CurrentTenant } from '../auth/current-tenant.decorator';
import { TenantDocument } from '../tenants/schemas/tenant.schema';
import { AnalyticsService } from './analytics.service';

@ApiTags('Analytics (Admin)')
@ApiSecurity('admin-jwt')
@UseGuards(JwtAuthGuard)
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('overview')
  @ApiOperation({ summary: 'Session counts, top languages, usage stats' })
  getOverview(@CurrentTenant() tenant: TenantDocument) {
    return this.analyticsService.getOverview(tenant._id.toString());
  }

  @Get('conversations')
  @ApiOperation({ summary: 'Paginated list of all conversations' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getConversations(
    @CurrentTenant() tenant: TenantDocument,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.analyticsService.getConversations(
      tenant._id.toString(),
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
    );
  }

  @Get('conversations/:sessionId')
  @ApiOperation({ summary: 'Full conversation thread by session ID' })
  getConversationDetail(
    @Param('sessionId') sessionId: string,
    @CurrentTenant() tenant: TenantDocument,
  ) {
    return this.analyticsService.getConversationDetail(tenant._id.toString(), sessionId);
  }
}
