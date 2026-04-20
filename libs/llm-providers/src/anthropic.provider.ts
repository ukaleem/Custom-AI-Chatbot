import Anthropic from '@anthropic-ai/sdk';
import { ILLMProvider, ILLMMessage } from '@custom-ai-chatbot/shared-types';

export class AnthropicProvider implements ILLMProvider {
  private readonly client: Anthropic;
  private readonly model: string;

  constructor(apiKey: string, model = 'claude-sonnet-4-6') {
    this.client = new Anthropic({ apiKey });
    this.model = model;
  }

  isConfigured(): boolean { return true; }

  async chat(messages: ILLMMessage[], systemPrompt: string): Promise<string> {
    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 1024,
      system: systemPrompt,
      messages: messages.map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    });
    const block = response.content[0];
    return block.type === 'text' ? block.text : '';
  }

  async embed(_text: string): Promise<number[]> {
    throw new Error(
      'Anthropic does not provide an embeddings API. Configure OpenAI or Gemini as your embedding provider.',
    );
  }

  async detectLanguage(text: string): Promise<string> {
    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 5,
      messages: [{
        role: 'user',
        content: `Detect the language of this text. Respond with ONLY the ISO 639-1 two-letter code (en, it, de, fr, es, etc.): "${text.slice(0, 200)}"`,
      }],
    });
    const block = response.content[0];
    return block.type === 'text' ? block.text.trim().toLowerCase().slice(0, 2) : 'en';
  }
}
