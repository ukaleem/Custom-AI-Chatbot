import OpenAI from 'openai';
import { ILLMProvider, ILLMMessage } from '@custom-ai-chatbot/shared-types';

export class OpenAiProvider implements ILLMProvider {
  private readonly client: OpenAI;
  private readonly model: string;
  private readonly embeddingModel: string;
  public lastUsage: { inputTokens: number; outputTokens: number; model: string } | null = null;

  constructor(apiKey: string, model = 'gpt-4o', embeddingModel = 'text-embedding-3-small') {
    this.client = new OpenAI({ apiKey });
    this.model = model;
    this.embeddingModel = embeddingModel;
  }

  isConfigured(): boolean { return true; }

  async chat(messages: ILLMMessage[], systemPrompt: string): Promise<string> {
    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
      ],
      temperature: 0.7,
      max_tokens: 1024,
    });
    this.lastUsage = {
      inputTokens: response.usage?.prompt_tokens ?? 0,
      outputTokens: response.usage?.completion_tokens ?? 0,
      model: response.model ?? this.model,
    };
    return response.choices[0]?.message?.content ?? '';
  }

  async embed(text: string): Promise<number[]> {
    const response = await this.client.embeddings.create({ model: this.embeddingModel, input: text });
    return response.data[0].embedding;
  }

  async detectLanguage(text: string): Promise<string> {
    const response = await this.client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: `Detect the language of this text. Respond with ONLY the ISO 639-1 two-letter code (en, it, de, fr, es, etc.): "${text.slice(0, 200)}"` }],
      max_tokens: 5, temperature: 0,
    });
    return (response.choices[0]?.message?.content ?? 'en').trim().toLowerCase().slice(0, 2);
  }
}
