import { WidgetConfig } from './config.service';

export interface ChatResponse {
  sessionId: string;
  message: string;
  quickReplies?: string[];
  flowState: string;
  language: string;
  isComplete: boolean;
}

export interface BotConfig {
  botName: string;
  primaryColor: string;
  greeting: string;
  defaultLanguage: string;
  supportedLanguages: string[];
}

export class ChatService {
  private readonly base: string;
  private readonly slug: string;

  constructor(config: WidgetConfig) {
    this.base = config.apiUrl;
    this.slug = config.tenantId;
  }

  async getConfig(): Promise<BotConfig> {
    const res = await fetch(`${this.base}/api/v1/widget/${this.slug}/config`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json() as Promise<BotConfig>;
  }

  async startSession(language: string): Promise<ChatResponse> {
    const res = await fetch(`${this.base}/api/v1/widget/${this.slug}/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ language }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json() as Promise<ChatResponse>;
  }

  async sendMessage(sessionId: string, message: string): Promise<ChatResponse> {
    const res = await fetch(`${this.base}/api/v1/widget/${this.slug}/message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, message }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json() as Promise<ChatResponse>;
  }
}
