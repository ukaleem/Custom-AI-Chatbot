import { IFlowContext, IStateTransition, ILLMProvider } from '@custom-ai-chatbot/shared-types';
import { buildSystemPrompt } from '../prompts/system.prompt';

export class OutOfScopeState {
  async handle(
    context: IFlowContext,
    userInput: string,
    llm: ILLMProvider,
  ): Promise<IStateTransition> {
    const { language } = context;
    const systemPrompt = buildSystemPrompt(context.botName ?? 'Guide');

    const message = await llm.chat(
      [{
        role: 'user',
        content: `The tourist asked about something outside Catania tourism: "${userInput}".
Politely decline, explain you specialise only in Catania tourism, and offer 2-3 things you CAN help with (attractions, food, transport, local tips).
Respond in ${language}. Keep it to 2-3 sentences.`,
      }],
      systemPrompt,
    );

    return { message, nextState: 'FOLLOW_UP', isTerminal: false };
  }
}
