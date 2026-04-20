import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ILLMProvider } from '@custom-ai-chatbot/shared-types';
import { createLlmProvider, UnconfiguredLlmProvider } from '@custom-ai-chatbot/llm-providers';
import { Tenant, TenantDocument } from '../tenants/schemas/tenant.schema';

@Injectable()
export class LlmService {
  constructor(
    @InjectModel(Tenant.name) private readonly tenantModel: Model<TenantDocument>,
  ) {}

  async forTenant(tenantId: string): Promise<ILLMProvider> {
    const tenant = await this.tenantModel
      .findById(tenantId)
      .select('+llmConfig')
      .lean()
      .exec();

    if (!tenant?.llmConfig?.apiKey) {
      return new UnconfiguredLlmProvider();
    }

    return createLlmProvider({
      provider: tenant.llmConfig.provider,
      apiKey: tenant.llmConfig.apiKey,
      model: tenant.llmConfig.model || undefined,
      embeddingModel: tenant.llmConfig.embeddingModel || undefined,
    });
  }

  forTenantSync(llmConfig: { provider: string; apiKey: string; model?: string; embeddingModel?: string } | undefined): ILLMProvider {
    if (!llmConfig?.apiKey) return new UnconfiguredLlmProvider();
    return createLlmProvider({
      provider: llmConfig.provider as 'openai' | 'anthropic' | 'gemini' | 'mistral',
      apiKey: llmConfig.apiKey,
      model: llmConfig.model || undefined,
      embeddingModel: llmConfig.embeddingModel || undefined,
    });
  }
}
