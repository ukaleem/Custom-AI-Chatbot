import { IFlowContext, IStateTransition, ILLMProvider } from '@custom-ai-chatbot/shared-types';
import { buildSystemPrompt } from '../prompts/system.prompt';

const OUT_OF_SCOPE_PATTERNS = [
  /\b(weather|meteo|wetter|météo|clima)\b/i,
  /\b(politics|governo|government|política)\b/i,
  /\b(hotel|hostel|airbnb|accommodation|alloggio|unterkunft|hébergement)\b/i,
  /\b(flight|volo|flug|vol|avion|airplane)\b/i,
  /\b(covid|vaccine|vaccin|impfung)\b/i,
];

function isOutOfScope(input: string): boolean {
  return OUT_OF_SCOPE_PATTERNS.some((p) => p.test(input));
}

export class FollowUpState {
  async handle(
    context: IFlowContext,
    userInput: string,
    llm: ILLMProvider,
  ): Promise<IStateTransition> {
    if (isOutOfScope(userInput)) {
      return { message: '', nextState: 'OUT_OF_SCOPE', isTerminal: false };
    }

    const { language } = context;
    const systemPrompt = buildSystemPrompt(context.botName ?? 'Guide', context.systemInstruction);

    const history = context.messageHistory.slice(-6).map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));

    const messages = [
      ...history,
      {
        role: 'user' as const,
        content: `The tourist asks: "${userInput}". Answer using only the attractions and plan already discussed. Respond in ${language}.`,
      },
    ];

    const message = await llm.chat(messages, systemPrompt);

    return { message, nextState: 'FOLLOW_UP', isTerminal: false };
  }
}
