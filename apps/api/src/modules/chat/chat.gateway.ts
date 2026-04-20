import { Logger } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { TenantsService } from '../tenants/tenant.service';
import { ChatService } from './chat.service';

interface AuthenticatedSocket extends Socket {
  tenantId?: string;
  tenantData?: Awaited<ReturnType<TenantsService['findByApiKey']>>;
}

@WebSocketGateway({ cors: { origin: '*' }, namespace: '/chat' })
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(ChatGateway.name);

  constructor(
    private readonly chatService: ChatService,
    private readonly tenantsService: TenantsService,
  ) {}

  async handleConnection(client: AuthenticatedSocket) {
    const apiKey = client.handshake.headers['x-api-key'] as string
      ?? client.handshake.auth?.apiKey;

    if (!apiKey) {
      client.emit('error', { message: 'x-api-key required' });
      client.disconnect();
      return;
    }

    const tenant = await this.tenantsService.findByApiKey(apiKey);
    if (!tenant || !tenant.isActive) {
      client.emit('error', { message: 'Invalid or inactive API key' });
      client.disconnect();
      return;
    }

    client.tenantData = tenant;
    client.tenantId = tenant._id.toString();
    this.logger.log(`Client connected: ${client.id} (tenant: ${tenant.slug})`);
  }

  handleDisconnect(client: AuthenticatedSocket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('chat:start')
  async handleStartSession(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { language?: string },
  ) {
    if (!client.tenantData) throw new WsException('Not authenticated');
    try {
      const response = await this.chatService.startSession(client.tenantData, data.language);
      client.emit('chat:response', response);
    } catch (err) {
      client.emit('chat:error', { message: (err as Error).message });
    }
  }

  @SubscribeMessage('chat:message')
  async handleMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { sessionId: string; message: string },
  ) {
    if (!client.tenantData) throw new WsException('Not authenticated');
    if (!data.sessionId || !data.message) {
      throw new WsException('sessionId and message are required');
    }

    try {
      const response = await this.chatService.sendMessage(data.sessionId, client.tenantData, data.message);
      client.emit('chat:response', response);
    } catch (err) {
      client.emit('chat:error', { message: (err as Error).message });
    }
  }

  @SubscribeMessage('chat:end')
  async handleEndSession(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { sessionId: string },
  ) {
    if (!client.tenantData || !data.sessionId) return;
    try {
      await this.chatService.endSession(data.sessionId, client.tenantData);
      client.emit('chat:ended', { sessionId: data.sessionId });
    } catch (err) {
      client.emit('chat:error', { message: (err as Error).message });
    }
  }
}
