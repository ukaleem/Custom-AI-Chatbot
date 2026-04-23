import { Controller, Get, Post, Body, Param, NotFoundException, BadRequestException, Header } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';
import { TenantsService } from '../tenants/tenant.service';
import { ChatService } from '../chat/chat.service';

class StartSessionDto {
  @IsOptional()
  @IsString()
  language?: string;
}

class SendMessageDto {
  @IsString()
  sessionId!: string;

  @IsString()
  message!: string;
}

@ApiTags('widget')
@Controller('widget')
export class WidgetController {
  constructor(
    private readonly tenantsService: TenantsService,
    private readonly chatService: ChatService,
  ) {}

  @Get(':slug/config')
  @Header('Access-Control-Allow-Origin', '*')
  @ApiOperation({ summary: 'Get public bot configuration for a tenant' })
  async getConfig(@Param('slug') slug: string) {
    const tenant = await this.tenantsService.findBySlug(slug);
    if (!tenant || !tenant.isActive) throw new NotFoundException('Bot not found');
    return {
      botName: tenant.botConfig?.botName ?? 'Guide',
      primaryColor: tenant.botConfig?.primaryColor ?? '#2563EB',
      greeting: tenant.botConfig?.greeting ?? 'Hello! How can I help you?',
      defaultLanguage: tenant.botConfig?.defaultLanguage ?? 'en',
      supportedLanguages: tenant.botConfig?.supportedLanguages ?? ['en'],
    };
  }

  @Post(':slug/session')
  @Header('Access-Control-Allow-Origin', '*')
  @ApiOperation({ summary: 'Start a new chat session via widget' })
  async startSession(@Param('slug') slug: string, @Body() body: StartSessionDto) {
    const tenant = await this.tenantsService.findBySlug(slug);
    if (!tenant || !tenant.isActive) throw new NotFoundException('Bot not found');
    return this.chatService.startSession(tenant, body.language ?? 'en');
  }

  @Post(':slug/message')
  @Header('Access-Control-Allow-Origin', '*')
  @ApiOperation({ summary: 'Send a message via widget' })
  async sendMessage(@Param('slug') slug: string, @Body() body: SendMessageDto) {
    if (!body.sessionId || !body.message) throw new BadRequestException('sessionId and message are required');
    const tenant = await this.tenantsService.findBySlug(slug);
    if (!tenant || !tenant.isActive) throw new NotFoundException('Bot not found');
    return this.chatService.sendMessage(body.sessionId, tenant, body.message);
  }
}
