export type MessageRole = 'user' | 'assistant' | 'system';

export interface IMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export type TouristPreference = 'culture' | 'entertainment' | 'city-tour';
export type FoodPreference = 'sitting' | 'walking';

export interface IFlowParams {
  availableHours?: number;
  preference?: TouristPreference;
  wantsFood?: boolean;
  foodStyle?: FoodPreference;
}

export interface IConversation {
  id: string;
  tenantId: string;
  sessionId: string;
  language: string;
  messages: IMessage[];
  flowState: string;
  collectedParams: IFlowParams;
  isActive: boolean;
  startedAt: Date;
  lastMessageAt: Date;
  endedAt?: Date;
}

export interface IChatRequest {
  sessionId?: string;
  message: string;
  language?: string;
}

export interface IChatResponse {
  sessionId: string;
  message: string;
  quickReplies?: IQuickReply[];
  flowState: string;
  language: string;
  isComplete: boolean;
}

export interface IQuickReply {
  label: string;
  value: string;
}
