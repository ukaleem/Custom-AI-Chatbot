import { IFlowContext, IStateTransition, ILLMProvider } from '@custom-ai-chatbot/shared-types';
import { buildSystemPrompt } from '../prompts/system.prompt';

const PREFERENCE_MAP: Record<string, 'culture' | 'entertainment' | 'city-tour'> = {
  'culture': 'culture', 'cultura': 'culture', 'kultur': 'culture', 'culturel': 'culture',
  'entertainment': 'entertainment', 'intrattenimento': 'entertainment',
  'unterhaltung': 'entertainment', 'divertissement': 'entertainment', 'entretenimiento': 'entertainment',
  'city tour': 'city-tour', 'city-tour': 'city-tour', 'tour della città': 'city-tour',
  'stadtführung': 'city-tour', 'visite de la ville': 'city-tour', 'tour de la ciudad': 'city-tour',
  'city': 'city-tour', 'tour': 'city-tour',
};

function parsePreference(input: string): 'culture' | 'entertainment' | 'city-tour' | null {
  const lower = input.toLowerCase().trim();
  for (const [key, value] of Object.entries(PREFERENCE_MAP)) {
    if (lower.includes(key)) return value;
  }
  return null;
}

export class AskPreferenceState {
  async handle(
    context: IFlowContext,
    userInput: string,
    llm: ILLMProvider,
  ): Promise<IStateTransition> {
    const preference = parsePreference(userInput);

    if (!preference) {
      const systemPrompt = buildSystemPrompt(context.botName ?? 'Guide');
      const message = await llm.chat(
        [{ role: 'user', content: `The tourist said "${userInput}". Ask them to choose from: Culture, Entertainment, or City Tour. Respond in ${context.language}.` }],
        systemPrompt,
      );
      return {
        message,
        nextState: 'ASK_PREFERENCE',
        quickReplies: [
          { label: '🏛 Culture', value: 'culture' },
          { label: '🎭 Entertainment', value: 'entertainment' },
          { label: '🗺 City Tour', value: 'city-tour' },
        ],
        isTerminal: false,
      };
    }

    const systemPrompt = buildSystemPrompt(context.botName ?? 'Guide');
    const message = await llm.chat(
      [{ role: 'user', content: `Great, the tourist chose ${preference}! Acknowledge and ask: "Would you also like to include a food stop?" Respond in ${context.language}.` }],
      systemPrompt,
    );

    return {
      message,
      nextState: 'ASK_FOOD',
      collectedParams: { preference },
      quickReplies: [
        { label: '✅ Yes', value: 'yes' },
        { label: '❌ No', value: 'no' },
      ],
      isTerminal: false,
    };
  }
}
