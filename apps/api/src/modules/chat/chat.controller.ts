import {
  Body, Controller, Get, HttpCode, HttpStatus, Param,
  Patch, Post, UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { ApiKeyGuard } from '../auth/api-key.guard';
import { CurrentTenant } from '../auth/current-tenant.decorator';
import { TenantDocument } from '../tenants/schemas/tenant.schema';
import { ChatService } from './chat.service';
import { StartSessionDto } from './dto/start-session.dto';
import { SendMessageDto } from './dto/send-message.dto';

@ApiTags('Chat')
@ApiSecurity('tenant-api-key')
@UseGuards(ApiKeyGuard)
@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('session')
  @ApiOperation({ summary: 'Start a new chat session — bot sends opening greeting' })
  async startSession(
    @CurrentTenant() tenant: TenantDocument,
    @Body() dto: StartSessionDto,
  ) {
    return this.chatService.startSession(tenant, dto.language);
  }

  @Post('message')
  @ApiOperation({ summary: 'Send a message and receive the bot reply' })
  async sendMessage(
    @CurrentTenant() tenant: TenantDocument,
    @Body() dto: SendMessageDto,
  ) {
    return this.chatService.sendMessage(dto.sessionId, tenant, dto.message);
  }

  @Get('session/:sessionId/history')
  @ApiOperation({ summary: 'Retrieve full conversation history' })
  async getHistory(
    @Param('sessionId') sessionId: string,
    @CurrentTenant() tenant: TenantDocument,
  ) {
    return this.chatService.getHistory(sessionId, tenant);
  }

  @Patch('session/:sessionId/end')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'End a session (marks it inactive)' })
  async endSession(
    @Param('sessionId') sessionId: string,
    @CurrentTenant() tenant: TenantDocument,
  ) {
    await this.chatService.endSession(sessionId, tenant);
  }
}
