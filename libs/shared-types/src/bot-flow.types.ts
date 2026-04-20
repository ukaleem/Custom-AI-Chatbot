export type BotFlowState =
  | 'GREETING'
  | 'ASK_DURATION'
  | 'ASK_PREFERENCE'
  | 'ASK_FOOD'
  | 'ASK_FOOD_STYLE'
  | 'GENERATE_PLAN'
  | 'FOLLOW_UP'
  | 'OUT_OF_SCOPE';

export interface IFlowContext {
  tenantId: string;
  sessionId: string;
  language: string;
  currentState: BotFlowState;
  collectedParams: {
    availableHours?: number;
    preference?: 'culture' | 'entertainment' | 'city-tour';
    wantsFood?: boolean;
    foodStyle?: 'sitting' | 'walking';
  };
  messageHistory: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
}

export interface IStateTransition {
  message: string;
  quickReplies?: Array<{ label: string; value: string }>;
  nextState: BotFlowState;
  isTerminal: boolean;
}

export interface ILLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ILLMProvider {
  chat(messages: ILLMMessage[], systemPrompt: string): Promise<string>;
  embed(text: string): Promise<number[]>;
  detectLanguage(text: string): Promise<string>;
  isConfigured(): boolean;
}
