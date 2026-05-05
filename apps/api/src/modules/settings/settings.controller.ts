import { Body, Controller, Get, HttpCode, HttpStatus, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { JwtAuthGuard } from '../admin-auth/jwt-auth.guard';
import { CurrentTenant } from '../auth/current-tenant.decorator';
import { Tenant, TenantDocument } from '../tenants/schemas/tenant.schema';
import { UpdateLlmConfigDto } from '../tenants/dto/update-llm-config.dto';
import { UpdateBotConfigDto } from './dto/update-bot-config.dto';
import { BOT_PERSONAS } from '@custom-ai-chatbot/bot-core';

@ApiTags('Settings')
@ApiBearerAuth('admin-jwt')
@UseGuards(JwtAuthGuard)
@Controller('settings')
export class SettingsController {
  constructor(
    @InjectModel(Tenant.name) private readonly tenantModel: Model<TenantDocument>,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get current bot + account settings (LLM key never returned)' })
  async getSettings(@CurrentTenant() tenant: TenantDocument) {
    const full = await this.tenantModel
      .findById(tenant._id)
      .select('+llmConfig')
      .exec();
    return {
      botConfig: tenant.botConfig,
      plan: tenant.plan,
      usage: tenant.usage,
      llmProvider: full?.llmConfig?.provider ?? null,
      llmModel: full?.llmConfig?.model ?? null,
    };
  }

  @Get('personas')
  @ApiOperation({ summary: 'List all available bot personas (name, description, default instruction)' })
  getPersonas() {
    return Object.entries(BOT_PERSONAS).map(([key, p]) => ({
      key,
      name: p.name,
      description: p.description,
      instruction: p.instruction,
      hasDefaultInstruction: !!p.instruction,
    }));
  }

  @Put('llm')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Set your LLM provider and API key' })
  async updateLlmConfig(
    @CurrentTenant() tenant: TenantDocument,
    @Body() dto: UpdateLlmConfigDto,
  ) {
    await this.tenantModel
      .findByIdAndUpdate(tenant._id, { $set: { llmConfig: dto } })
      .exec();

    return { message: 'LLM configuration saved successfully' };
  }

  @Put('bot')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update bot appearance and behaviour settings' })
  async updateBotConfig(
    @CurrentTenant() tenant: TenantDocument,
    @Body() dto: UpdateBotConfigDto,
  ) {
    const update: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(dto)) {
      if (value !== undefined) update[`botConfig.${key}`] = value;
    }

    const updated = await this.tenantModel
      .findByIdAndUpdate(tenant._id, { $set: update }, { new: true })
      .select('botConfig')
      .exec();

    return { botConfig: updated?.botConfig };
  }
}
