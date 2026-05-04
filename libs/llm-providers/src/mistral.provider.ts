import { Mistral } from '@mistralai/mistralai';
import { ILLMProvider, ILLMMessage } from '@custom-ai-chatbot/shared-types';

export class MistralProvider implements ILLMProvider {
  private readonly client: Mistral;
  private readonly model: string;
  private readonly embeddingModel: string;
  public lastUsage: { inputTokens: number; outputTokens: number; model: string } | null = null;

  constructor(apiKey: string, model = 'mistral-large-latest', embeddingModel = 'mistral-embed') {
    this.client = new Mistral({ apiKey });
    this.model = model;
    this.embeddingModel = embeddingModel;
  }

  isConfigured(): boolean { return true; }

  async chat(messages: ILLMMessage[], systemPrompt: string): Promise<string> {
    const response = await this.client.chat.complete({
      model: this.model,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
      ],
    });
    const usage = (response as any).usage;
    this.lastUsage = {
      inputTokens: usage?.prompt_tokens ?? 0,
      outputTokens: usage?.completion_tokens ?? 0,
      model: this.model,
    };
    return (response.choices?.[0]?.message?.content as string) ?? '';
  }

  async embed(text: string): Promise<number[]> {
    const response = await this.client.embeddings.create({ model: this.embeddingModel, inputs: [text] });
    return (response.data[0].embedding as number[]) ?? [];
  }

  async detectLanguage(text: string): Promise<string> {
    const response = await this.client.chat.complete({
      model: this.model,
      messages: [{ role: 'user', content: `Detect the language of this text. Respond with ONLY the ISO 639-1 two-letter code (en, it, de, fr, es, etc.): "${text.slice(0, 200)}"` }],
      maxTokens: 5,
    });
    return ((response.choices?.[0]?.message?.content as string) ?? 'en').trim().toLowerCase().slice(0, 2);
  }
}
