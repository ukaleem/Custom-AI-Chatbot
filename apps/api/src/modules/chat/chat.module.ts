import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { LlmModule } from '../llm/llm.module';
import { RagModule } from '../rag/rag.module';
import { TenantsModule } from '../tenants/tenant.module';
import { Conversation, ConversationSchema } from './schemas/conversation.schema';
import { SessionService } from './session.service';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { ChatGateway } from './chat.gateway';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Conversation.name, schema: ConversationSchema }]),
    AuthModule,
    LlmModule,
    RagModule,
    TenantsModule,
  ],
  providers: [SessionService, ChatService, ChatGateway],
  controllers: [ChatController],
  exports: [ChatService, SessionService],
})
export class ChatModule {}
