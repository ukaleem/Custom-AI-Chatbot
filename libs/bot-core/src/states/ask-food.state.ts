import { IFlowContext, IStateTransition, ILLMProvider } from '@custom-ai-chatbot/shared-types';
import { buildSystemPrompt } from '../prompts/system.prompt';

const YES_WORDS = /\b(yes|si|sì|ja|oui|sí|yep|yeah|sure|certo|absolutel|of course)\b/i;
const NO_WORDS  = /\b(no|nein|non|nope|not|nope|skip|without food|senza)\b/i;

export class AskFoodState {
  async handle(
    context: IFlowContext,
    userInput: string,
    llm: ILLMProvider,
  ): Promise<IStateTransition> {
    const lower = userInput.toLowerCase();

    if (YES_WORDS.test(lower)) {
      const systemPrompt = buildSystemPrompt(context.botName ?? 'Guide');
      const message = await llm.chat(
        [{ role: 'user', content: `The tourist wants food! Ask: "Would you prefer a sit-down restaurant or walking street food?" Respond in ${context.language}.` }],
        systemPrompt,
      );
      return {
        message,
        nextState: 'ASK_FOOD_STYLE',
        collectedParams: { wantsFood: true },
        quickReplies: [
          { label: '🍽 Sit-down', value: 'sitting' },
          { label: '🌮 Street food', value: 'walking' },
        ],
        isTerminal: false,
      };
    }

    if (NO_WORDS.test(lower)) {
      return {
        message: '',
        nextState: 'GENERATE_PLAN',
        collectedParams: { wantsFood: false },
        isTerminal: false,
      };
    }

    // Ambiguous answer — ask again
    const systemPrompt = buildSystemPrompt(context.botName ?? 'Guide');
    const message = await llm.chat(
      [{ role: 'user', content: `The tourist said "${userInput}". Ask yes or no: do they want to include a food stop? Respond in ${context.language}.` }],
      systemPrompt,
    );
    return {
      message,
      nextState: 'ASK_FOOD',
      quickReplies: [
        { label: '✅ Yes', value: 'yes' },
        { label: '❌ No', value: 'no' },
      ],
      isTerminal: false,
    };
  }
}
