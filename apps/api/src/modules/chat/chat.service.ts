import { Injectable, BadRequestException, HttpStatus, HttpException } from '@nestjs/common';
import { FlowEngine } from '@custom-ai-chatbot/bot-core';
import { AttractionCategory, IAttractionResult, RetrievalFn } from '@custom-ai-chatbot/shared-types';
import { TenantDocument } from '../tenants/schemas/tenant.schema';
import { LlmService } from '../llm/llm.service';
import { RetrievalService } from '../rag/retrieval.service';
import { TenantsService } from '../tenants/tenant.service';
import { SessionService } from './session.service';
import { IChatResponse } from '@custom-ai-chatbot/shared-types';
import { UsageService } from '../billing/usage.service';

const PREFERENCE_TO_CATEGORIES: Record<string, string[]> = {
  culture: ['culture'],
  entertainment: ['entertainment'],
  'city-tour': ['city-tour', 'culture', 'entertainment'],
};

@Injectable()
export class ChatService {
  constructor(
    private readonly sessionService: SessionService,
    private readonly llmService: LlmService,
    private readonly retrievalService: RetrievalService,
    private readonly tenantsService: TenantsService,
    private readonly usageService: UsageService,
  ) {}

  async startSession(tenant: TenantDocument, language = 'en'): Promise<IChatResponse> {
    const overLimit = await this.usageService.isOverLimit(tenant._id.toString());
    if (overLimit) {
      throw new HttpException(
        { statusCode: 429, message: 'Monthly session limit reached. Please upgrade your plan.' },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const conv = await this.sessionService.create(tenant._id.toString(), language);
    const llm = await this.llmService.forTenant(tenant._id.toString());
    const botName = tenant.botConfig?.botName ?? 'Guide';

    const context = this.sessionService.buildFlowContext(conv, botName);
    const engine = this.buildEngine(tenant, llm);

    const { transition, updatedContext } = await engine.process(context, '', llm);

    await this.sessionService.saveContext(conv, updatedContext, transition.message, transition.quickReplies);
    await this.tenantsService.incrementSessionCount(tenant._id.toString());

    return {
      sessionId: conv.sessionId,
      message: transition.message,
      quickReplies: transition.quickReplies,
      flowState: updatedContext.currentState,
      language: updatedContext.language,
      isComplete: transition.isTerminal,
    };
  }

  async sendMessage(sessionId: string, tenant: TenantDocument, message: string): Promise<IChatResponse> {
    const conv = await this.sessionService.findBySessionId(sessionId, tenant._id.toString());
    const llm = await this.llmService.forTenant(tenant._id.toString());
    const botName = tenant.botConfig?.botName ?? 'Guide';

    const context = this.sessionService.buildFlowContext(conv, botName);
    const engine = this.buildEngine(tenant, llm);

    const { transition, updatedContext } = await engine.process(context, message, llm);

    await this.sessionService.saveContext(conv, updatedContext, transition.message, transition.quickReplies);
    await this.usageService.incrementMessage(tenant._id.toString());

    return {
      sessionId,
      message: transition.message,
      quickReplies: transition.quickReplies,
      flowState: updatedContext.currentState,
      language: updatedContext.language,
      isComplete: transition.isTerminal,
    };
  }

  async getHistory(sessionId: string, tenant: TenantDocument) {
    const conv = await this.sessionService.findBySessionId(sessionId, tenant._id.toString());
    return {
      sessionId: conv.sessionId,
      currentState: conv.currentState,
      language: conv.language,
      collectedParams: conv.collectedParams,
      messages: conv.messages,
      isActive: conv.isActive,
    };
  }

  async endSession(sessionId: string, tenant: TenantDocument): Promise<void> {
    await this.sessionService.endSession(sessionId, tenant._id.toString());
  }

  private buildEngine(tenant: TenantDocument, llm: ReturnType<LlmService['forTenantSync']>): FlowEngine {
    const retrievalFn: RetrievalFn = async (params) => {
      const categories = PREFERENCE_TO_CATEGORIES[params.preference] ?? [];
      const query = `${params.preference} attractions in Catania${params.wantsFood ? `, food ${params.foodStyle ?? ''}` : ''}`;

      const results = await this.retrievalService.search({
        tenantId: params.tenantId,
        naturalLanguageQuery: query,
        llmProvider: llm,
        filters: {
          categories: categories as AttractionCategory[],
          maxDurationMinutes: params.availableHours * 60,
          ...(params.wantsFood && params.foodStyle ? { foodStyle: params.foodStyle as 'sitting' | 'walking' | 'both' } : {}),
        },
        limit: 8,
      });

      return results.map((r: Record<string, unknown>) => ({
        id: String(r['id'] ?? r['_id'] ?? ''),
        name: String((r['name'] as Record<string, string>)?.en ?? r['name'] ?? ''),
        description: String((r['description'] as Record<string, string>)?.en ?? r['description'] ?? ''),
        category: String(r['category'] ?? ''),
        durationMinutes: Number(r['durationMinutes']) || undefined,
        priceRange: r['priceRange'] ? String(r['priceRange']) : undefined,
        address: r['address'] ? String(r['address']) : undefined,
        tags: Array.isArray(r['tags']) ? r['tags'].map(String) : [],
      }));
    };

    return new FlowEngine(retrievalFn);
  }
}
