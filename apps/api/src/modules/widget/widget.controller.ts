import { Controller, Get, Post, Body, Param, NotFoundException, BadRequestException, Header, Res } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';
import { Response } from 'express';
import { join } from 'path';
import { existsSync } from 'fs';
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

  @Get('chatbot.js')
  @Header('Content-Type', 'application/javascript')
  @Header('Access-Control-Allow-Origin', '*')
  @Header('Cache-Control', 'public, max-age=3600')
  @ApiOperation({ summary: 'Serve embeddable widget bundle' })
  serveBundle(@Res() res: Response) {
    const widgetPath = join(process.cwd(), 'dist', 'apps', 'widget', 'chatbot.js');
    if (!existsSync(widgetPath)) {
      res.status(404).send('Widget bundle not built. Run: node apps/widget/build.js --production');
      return;
    }
    res.sendFile(widgetPath);
  }

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
