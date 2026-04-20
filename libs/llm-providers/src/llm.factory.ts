import { ILLMProvider, ILLMMessage } from '@custom-ai-chatbot/shared-types';
import { OpenAiProvider } from './openai.provider';
import { AnthropicProvider } from './anthropic.provider';
import { GeminiProvider } from './gemini.provider';
import { MistralProvider } from './mistral.provider';

export interface LlmProviderConfig {
  provider: 'openai' | 'anthropic' | 'gemini' | 'mistral';
  apiKey: string;
  model?: string;
  embeddingModel?: string;
}

export function createLlmProvider(config: LlmProviderConfig): ILLMProvider {
  switch (config.provider) {
    case 'openai':
      return new OpenAiProvider(config.apiKey, config.model, config.embeddingModel);
    case 'anthropic':
      return new AnthropicProvider(config.apiKey, config.model);
    case 'gemini':
      return new GeminiProvider(config.apiKey, config.model);
    case 'mistral':
      return new MistralProvider(config.apiKey, config.model, config.embeddingModel);
    default:
      throw new Error(`Unsupported LLM provider: ${(config as LlmProviderConfig).provider}`);
  }
}

export class UnconfiguredLlmProvider implements ILLMProvider {
  isConfigured(): boolean { return false; }

  async chat(_messages: ILLMMessage[], _systemPrompt: string): Promise<string> {
    throw new Error(
      'No LLM configured for this tenant. Set your API key via PUT /api/v1/settings/llm',
    );
  }

  async embed(_text: string): Promise<number[]> {
    throw new Error('No LLM configured for this tenant.');
  }

  async detectLanguage(_text: string): Promise<string> {
    return 'en';
  }
}
