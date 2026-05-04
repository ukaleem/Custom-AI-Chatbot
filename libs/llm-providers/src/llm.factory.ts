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
    case 'openai':    return new OpenAiProvider(config.apiKey, config.model, config.embeddingModel);
    case 'anthropic': return new AnthropicProvider(config.apiKey, config.model);
    case 'gemini':    return new GeminiProvider(config.apiKey, config.model);
    case 'mistral':   return new MistralProvider(config.apiKey, config.model, config.embeddingModel);
    default: throw new Error(`Unsupported LLM provider: ${(config as LlmProviderConfig).provider}`);
  }
}

export class UnconfiguredLlmProvider implements ILLMProvider {
  public lastUsage: { inputTokens: number; outputTokens: number; model: string } | null = null;
  isConfigured(): boolean { return false; }

  private est(text: string) { return Math.ceil(text.split(/\s+/).filter(Boolean).length * 1.33); }

  async chat(messages: ILLMMessage[], systemPrompt: string): Promise<string> {
    const userMessages = messages.filter(m => m.role === 'user');
    const count = userMessages.length;
    const demos = [
      "Welcome! I'm your AI assistant. ⚠️ Demo mode — add an LLM API key in Settings → LLM API Key for full AI responses. How can I help you?",
      "Great! What are you looking for today?",
      "Perfect! Let me help you with that.",
      "Got it! I'll put together a personalised response for you. [Demo mode — add an LLM API key for real AI answers]",
      "Here's a summary based on your preferences! Go to Settings → LLM API Key to enable full AI-powered responses.",
    ];
    const reply = demos[Math.min(count, demos.length - 1)];
    const inputText = [systemPrompt, ...messages.map(m => m.content)].join(' ');
    this.lastUsage = { inputTokens: this.est(inputText), outputTokens: this.est(reply), model: 'demo' };
    return reply;
  }

  async embed(_text: string): Promise<number[]> { return new Array(1536).fill(0); }
  async detectLanguage(_text: string): Promise<string> { return 'en'; }
}
