import { IFlowContext, IStateTransition, ILLMProvider, RetrievalFn, IAttractionResult } from '@custom-ai-chatbot/shared-types';
import { buildSystemPrompt, buildPlanPrompt } from '../prompts/system.prompt';

function formatAttractionList(attractions: IAttractionResult[]): string {
  return attractions
    .map((a, i) => {
      const duration = a.durationMinutes ? ` (~${a.durationMinutes} min)` : '';
      const price = a.priceRange ? ` [${a.priceRange}]` : '';
      const addr = a.address ? ` | ${a.address}` : '';
      return `${i + 1}. ${a.name}${duration}${price}${addr}\n   ${a.description}`;
    })
    .join('\n\n');
}

export class GeneratePlanState {
  constructor(private readonly retrievalFn: RetrievalFn) {}

  async handle(
    context: IFlowContext,
    _userInput: string,
    llm: ILLMProvider,
  ): Promise<IStateTransition> {
    const { tenantId, language, collectedParams } = context;
    const { availableHours = 3, preference = 'city-tour', wantsFood = false, foodStyle } = collectedParams;

    const attractions = await this.retrievalFn({
      tenantId,
      preference,
      availableHours,
      wantsFood,
      foodStyle,
    });

    if (!attractions.length) {
      const systemPrompt = buildSystemPrompt(context.botName ?? 'Guide', context.systemInstruction);
      const message = await llm.chat(
        [{
          role: 'user',
          content: `Apologise that you don't have specific recommendations for this request yet, but offer to help with general Catania tourism tips. Respond in ${language}.`,
        }],
        systemPrompt,
      );
      return { message, nextState: 'FOLLOW_UP', isTerminal: false };
    }

    const planPrompt = buildPlanPrompt({ availableHours, preference, wantsFood, foodStyle, language });
    const attractionList = formatAttractionList(attractions);

    const systemPrompt = buildSystemPrompt(context.botName ?? 'Guide', context.systemInstruction);
    const message = await llm.chat(
      [{
        role: 'user',
        content: `${planPrompt}\n\nAVAILABLE ATTRACTIONS:\n${attractionList}`,
      }],
      systemPrompt,
    );

    return { message, nextState: 'FOLLOW_UP', isTerminal: false };
  }
}
