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

  async chat(messages: ILLMMessage[], _systemPrompt: string): Promise<string> {
    // Return a guided demo response based on conversation length so the full
    // bot flow can be tested without a real LLM key configured.
    const userMessages = messages.filter(m => m.role === 'user');
    const count = userMessages.length;
    const demos = [
      "Welcome! I'm your Catania tourist guide. ⚠️ Demo mode — add an LLM API key in Settings → LLM API Key to enable full AI responses. How many hours do you have to explore?",
      "Great! Do you prefer cultural sites, nature, or food experiences?",
      "Perfect choice! Would you also like restaurant or food recommendations?",
      "Got it! I'll put together a personalized Catania itinerary for you. [Demo mode — real AI recommendations require an LLM API key]",
      "Here's your suggested itinerary based on your preferences! To unlock full AI-powered recommendations, go to Admin Dashboard → LLM API Key and add your provider key.",
    ];
    return demos[Math.min(count, demos.length - 1)];
  }

  async embed(_text: string): Promise<number[]> {
    // Return a zero vector — RAG search won't find matches but won't crash.
    return new Array(1536).fill(0);
  }

  async detectLanguage(_text: string): Promise<string> {
    return 'en';
  }
}
