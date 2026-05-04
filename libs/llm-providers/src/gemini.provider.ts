import { GoogleGenerativeAI } from '@google/generative-ai';
import { ILLMProvider, ILLMMessage } from '@custom-ai-chatbot/shared-types';

export class GeminiProvider implements ILLMProvider {
  private readonly client: GoogleGenerativeAI;
  private readonly model: string;
  public lastUsage: { inputTokens: number; outputTokens: number; model: string } | null = null;

  constructor(apiKey: string, model = 'gemini-1.5-flash') {
    this.client = new GoogleGenerativeAI(apiKey);
    this.model = model;
  }

  isConfigured(): boolean { return true; }

  async chat(messages: ILLMMessage[], systemPrompt: string): Promise<string> {
    const genModel = this.client.getGenerativeModel({ model: this.model, systemInstruction: systemPrompt });
    const history = messages.slice(0, -1).map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));
    const chat = genModel.startChat({ history });
    const last = messages[messages.length - 1];
    const result = await chat.sendMessage(last?.content ?? '');
    const meta = result.response.usageMetadata;
    this.lastUsage = {
      inputTokens: meta?.promptTokenCount ?? 0,
      outputTokens: meta?.candidatesTokenCount ?? 0,
      model: this.model,
    };
    return result.response.text();
  }

  async embed(text: string): Promise<number[]> {
    const embeddingModel = this.client.getGenerativeModel({ model: 'text-embedding-004' });
    const result = await embeddingModel.embedContent(text);
    return result.embedding.values;
  }

  async detectLanguage(text: string): Promise<string> {
    const genModel = this.client.getGenerativeModel({ model: this.model });
    const result = await genModel.generateContent(
      `Detect the language of this text. Respond with ONLY the ISO 639-1 two-letter code (en, it, de, fr, es, etc.): "${text.slice(0, 200)}"`,
    );
    return result.response.text().trim().toLowerCase().slice(0, 2);
  }
}
