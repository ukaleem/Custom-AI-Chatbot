import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { IFlowContext } from '@custom-ai-chatbot/shared-types';
import { Conversation, ConversationDocument } from './schemas/conversation.schema';

@Injectable()
export class SessionService {
  constructor(
    @InjectModel(Conversation.name) private readonly convModel: Model<ConversationDocument>,
  ) {}

  async create(tenantId: string, language: string): Promise<ConversationDocument> {
    const sessionId = `sess_${uuidv4().replace(/-/g, '').slice(0, 20)}`;
    const conv = new this.convModel({
      sessionId,
      tenantId: new Types.ObjectId(tenantId),
      language,
      currentState: 'GREETING',
      collectedParams: {},
      messages: [],
    });
    return conv.save();
  }

  async findBySessionId(sessionId: string, tenantId: string): Promise<ConversationDocument> {
    const conv = await this.convModel
      .findOne({ sessionId, tenantId: new Types.ObjectId(tenantId), isActive: true })
      .exec();
    if (!conv) throw new NotFoundException(`Session "${sessionId}" not found or expired`);
    return conv;
  }

  async saveContext(conv: ConversationDocument, context: IFlowContext, assistantMessage: string, quickReplies?: { label: string; value: string }[]): Promise<void> {
    conv.currentState = context.currentState;
    conv.language = context.language;
    conv.collectedParams = context.collectedParams as unknown as ConversationDocument['collectedParams'];
    conv.lastMessageAt = new Date();

    const lastUserMsg = context.messageHistory.at(-2);
    const lastBotMsg = context.messageHistory.at(-1);

    if (lastUserMsg?.role === 'user') {
      conv.messages.push({ role: 'user', content: lastUserMsg.content, quickReplies: [], timestamp: new Date() });
    }
    if (lastBotMsg?.role === 'assistant') {
      conv.messages.push({ role: 'assistant', content: assistantMessage, quickReplies: quickReplies ?? [], timestamp: new Date() });
    }

    await conv.save();
  }

  async endSession(sessionId: string, tenantId: string): Promise<void> {
    const result = await this.convModel
      .findOneAndUpdate(
        { sessionId, tenantId: new Types.ObjectId(tenantId) },
        { $set: { isActive: false } },
      )
      .exec();
    if (!result) throw new NotFoundException(`Session "${sessionId}" not found`);
  }

  buildFlowContext(conv: ConversationDocument, botName: string): IFlowContext {
    const history = conv.messages.slice(-20).map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));

    return {
      tenantId: conv.tenantId.toString(),
      sessionId: conv.sessionId,
      language: conv.language,
      currentState: conv.currentState as IFlowContext['currentState'],
      botName,
      collectedParams: conv.collectedParams as IFlowContext['collectedParams'],
      messageHistory: history,
    };
  }
}
