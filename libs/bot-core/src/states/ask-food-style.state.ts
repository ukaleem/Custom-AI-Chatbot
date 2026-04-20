import { IFlowContext, IStateTransition, ILLMProvider } from '@custom-ai-chatbot/shared-types';

const SITTING_WORDS  = /\b(sit|sitting|restaurant|table|ristorante|tavolo|sitzen|restaurant|assis)\b/i;
const WALKING_WORDS  = /\b(walk|walking|street|food|snack|takeaway|ambulante|camminando|marche)\b/i;

export class AskFoodStyleState {
  async handle(
    context: IFlowContext,
    userInput: string,
    _llm: ILLMProvider,
  ): Promise<IStateTransition> {
    const lower = userInput.toLowerCase();

    const foodStyle = SITTING_WORDS.test(lower)
      ? 'sitting'
      : WALKING_WORDS.test(lower)
        ? 'walking'
        : null;

    if (!foodStyle) {
      return {
        message: '',
        nextState: 'ASK_FOOD_STYLE',
        quickReplies: [
          { label: '🍽 Sit-down', value: 'sitting' },
          { label: '🌮 Street food', value: 'walking' },
        ],
        isTerminal: false,
      };
    }

    return {
      message: '',
      nextState: 'GENERATE_PLAN',
      collectedParams: { foodStyle: foodStyle as 'sitting' | 'walking' },
      isTerminal: false,
    };
  }
}
