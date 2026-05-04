import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../admin-auth/jwt-auth.guard';
import { CurrentTenant } from '../auth/current-tenant.decorator';
import { TenantDocument } from '../tenants/schemas/tenant.schema';
import { AnalyticsService } from './analytics.service';

@ApiTags('Analytics (Admin)')
@UseGuards(JwtAuthGuard)
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('overview')
  @ApiOperation({ summary: 'Sessions, languages, token totals, model breakdown' })
  getOverview(@CurrentTenant() tenant: TenantDocument) {
    return this.analyticsService.getOverview(tenant._id.toString());
  }

  @Get('daily')
  @ApiOperation({ summary: 'Daily sessions + tokens for charts' })
  @ApiQuery({ name: 'days', required: false, type: Number })
  getDailyStats(@CurrentTenant() tenant: TenantDocument, @Query('days') days?: string) {
    return this.analyticsService.getDailyStats(tenant._id.toString(), days ? parseInt(days) : 30);
  }

  @Get('tokens')
  @ApiOperation({ summary: 'Token usage summary — today/week/month/all-time' })
  getTokenSummary(@CurrentTenant() tenant: TenantDocument) {
    return this.analyticsService.getTokenSummary(tenant._id.toString());
  }

  @Get('models')
  @ApiOperation({ summary: 'Usage breakdown by AI model' })
  getModelBreakdown(@CurrentTenant() tenant: TenantDocument) {
    return this.analyticsService.getModelBreakdown(tenant._id.toString());
  }

  @Get('conversations')
  @ApiOperation({ summary: 'Paginated conversations with token data + filters' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'language', required: false, type: String })
  @ApiQuery({ name: 'model', required: false, type: String })
  @ApiQuery({ name: 'minTokens', required: false, type: Number })
  getConversations(
    @CurrentTenant() tenant: TenantDocument,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('language') language?: string,
    @Query('model') model?: string,
    @Query('minTokens') minTokens?: string,
  ) {
    return this.analyticsService.getConversations(
      tenant._id.toString(),
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
      { language, model, minTokens: minTokens ? parseInt(minTokens) : undefined },
    );
  }

  @Get('conversations/:sessionId')
  @ApiOperation({ summary: 'Full session with per-message token breakdown' })
  getConversationDetail(@Param('sessionId') sessionId: string, @CurrentTenant() tenant: TenantDocument) {
    return this.analyticsService.getConversationDetail(tenant._id.toString(), sessionId);
  }
}
