import { IFlowContext, IStateTransition, ILLMProvider } from '@custom-ai-chatbot/shared-types';
import { detectLanguage } from '../utils/language-detect';
import { buildSystemPrompt } from '../prompts/system.prompt';

export class GreetingState {
  async handle(
    context: IFlowContext,
    userInput: string,
    llm: ILLMProvider,
  ): Promise<IStateTransition> {
    // Detect language from user's opening message
    const language = userInput.trim()
      ? await detectLanguage(userInput, llm)
      : context.language || 'en';

    const systemPrompt = buildSystemPrompt(context.botName ?? 'Guide');

    const prompt = `The tourist just started a conversation with: "${userInput || 'Hello'}".
Greet them warmly in language "${language}" and ask: "How many hours do you have available today?"
Keep it to 2-3 sentences maximum. Offer time options as quick replies.`;

    const message = await llm.chat(
      [{ role: 'user', content: prompt }],
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
      detectedLanguage: language,
    };
  }
}
