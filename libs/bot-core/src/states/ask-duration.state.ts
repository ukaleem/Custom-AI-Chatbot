import { IFlowContext, IStateTransition, ILLMProvider } from '@custom-ai-chatbot/shared-types';
import { buildSystemPrompt } from '../prompts/system.prompt';

const DURATION_MAP: Record<string, number> = {
  '1': 1, 'one': 1, 'un': 1, 'una': 1, 'ein': 1, 'une': 1,
  '2': 2, 'two': 2, 'due': 2, 'deux': 2, 'zwei': 2, 'dos': 2,
  '3': 3, 'three': 3, 'tre': 3, 'trois': 3, 'drei': 3, 'tres': 3,
  '4': 4, 'four': 4, 'quattro': 4,
  '5': 5, 'five': 5, 'cinque': 5,
  '6': 6, 'six': 6, 'sei': 6,
  '7': 7, 'seven': 7, 'sette': 7,
  '8': 8, 'eight': 8, 'otto': 8,
  'full day': 8, 'full': 8, 'giornata intera': 8, 'ganzer tag': 8, 'journée': 8, 'todo el dia': 8,
  'half day': 4, 'half': 4, 'mezza giornata': 4,
};

function parseHours(input: string): number | null {
  const lower = input.toLowerCase().trim();

  // Direct key match
  if (DURATION_MAP[lower] !== undefined) return DURATION_MAP[lower];

  // Numeric extraction
  const match = lower.match(/(\d+(?:\.\d+)?)/);
  if (match) {
    const n = parseFloat(match[1]);
    if (n >= 1 && n <= 12) return Math.round(n);
  }

  return null;
}

export class AskDurationState {
  async handle(
    context: IFlowContext,
    userInput: string,
    llm: ILLMProvider,
  ): Promise<IStateTransition> {
    const hours = parseHours(userInput);

    if (!hours) {
      const systemPrompt = buildSystemPrompt(context.botName ?? 'Guide');
      const message = await llm.chat(
        [{ role: 'user', content: `The tourist said "${userInput}". Ask them again how many hours they have (1, 2, 3, or full day). Respond in ${context.language}.` }],
        systemPrompt,
      );
      return {
        message,
        nextState: 'ASK_DURATION',
        quickReplies: [
          { label: '1 hour', value: '1' },
          { label: '2 hours', value: '2' },
          { label: '3 hours', value: '3' },
          { label: 'Full day', value: '8' },
        ],
        isTerminal: false,
      };
    }

    const systemPrompt = buildSystemPrompt(context.botName ?? 'Guide');
    const message = await llm.chat(
      [{ role: 'user', content: `The tourist has ${hours} hour(s). Acknowledge briefly and ask what they prefer: Culture, Entertainment, or City Tour. Respond in ${context.language}.` }],
      systemPrompt,
    );

    return {
      message,
      nextState: 'ASK_PREFERENCE',
      collectedParams: { availableHours: hours },
      quickReplies: [
        { label: '🏛 Culture', value: 'culture' },
        { label: '🎭 Entertainment', value: 'entertainment' },
        { label: '🗺 City Tour', value: 'city-tour' },
      ],
      isTerminal: false,
    };
  }
}
