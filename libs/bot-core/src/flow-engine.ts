import { IFlowContext, IStateTransition, ILLMProvider, BotFlowState, RetrievalFn } from '@custom-ai-chatbot/shared-types';
import { sanitizeUserInput } from './utils/sanitize';
import { GreetingState } from './states/greeting.state';
import { AskDurationState } from './states/ask-duration.state';
import { AskPreferenceState } from './states/ask-preference.state';
import { AskFoodState } from './states/ask-food.state';
import { AskFoodStyleState } from './states/ask-food-style.state';
import { GeneratePlanState } from './states/generate-plan.state';
import { FollowUpState } from './states/follow-up.state';
import { OutOfScopeState } from './states/out-of-scope.state';

export interface FlowResult {
  transition: IStateTransition;
  updatedContext: IFlowContext;
}

export class FlowEngine {
  private readonly greeting = new GreetingState();
  private readonly askDuration = new AskDurationState();
  private readonly askPreference = new AskPreferenceState();
  private readonly askFood = new AskFoodState();
  private readonly askFoodStyle = new AskFoodStyleState();
  private readonly generatePlan: GeneratePlanState;
  private readonly followUp = new FollowUpState();
  private readonly outOfScope = new OutOfScopeState();

  constructor(retrievalFn: RetrievalFn) {
    this.generatePlan = new GeneratePlanState(retrievalFn);
  }

  async process(
    context: IFlowContext,
    rawInput: string,
    llm: ILLMProvider,
  ): Promise<FlowResult> {
    const userInput = sanitizeUserInput(rawInput);

    const transition = await this.dispatch(context, userInput, llm);

    let updatedContext = this.mergeContext(context, transition, userInput);

    // Auto-advance: if a state transitions to GENERATE_PLAN without being there already
    if (
      transition.nextState === 'GENERATE_PLAN' &&
      context.currentState !== 'GENERATE_PLAN'
    ) {
      const planTransition = await this.generatePlan.handle(updatedContext, '', llm);
      updatedContext = this.mergeContext(updatedContext, planTransition, '');
      return { transition: planTransition, updatedContext };
    }

    return { transition, updatedContext };
  }

  private async dispatch(
    context: IFlowContext,
    userInput: string,
    llm: ILLMProvider,
  ): Promise<IStateTransition> {
    const state = context.currentState as BotFlowState;
    switch (state) {
      case 'GREETING':       return this.greeting.handle(context, userInput, llm);
      case 'ASK_DURATION':   return this.askDuration.handle(context, userInput, llm);
      case 'ASK_PREFERENCE': return this.askPreference.handle(context, userInput, llm);
      case 'ASK_FOOD':       return this.askFood.handle(context, userInput, llm);
      case 'ASK_FOOD_STYLE': return this.askFoodStyle.handle(context, userInput, llm);
      case 'GENERATE_PLAN':  return this.generatePlan.handle(context, userInput, llm);
      case 'FOLLOW_UP':      return this.followUp.handle(context, userInput, llm);
      case 'OUT_OF_SCOPE':   return this.outOfScope.handle(context, userInput, llm);
      default:               return this.greeting.handle(context, userInput, llm);
    }
  }

  private mergeContext(
    context: IFlowContext,
    transition: IStateTransition,
    userInput: string,
  ): IFlowContext {
    const updatedHistory = userInput
      ? [
          ...context.messageHistory,
          { role: 'user' as const, content: userInput },
          { role: 'assistant' as const, content: transition.message },
        ]
      : [
          ...context.messageHistory,
          { role: 'assistant' as const, content: transition.message },
        ];

    return {
      ...context,
      currentState: transition.nextState,
      language: transition.detectedLanguage ?? context.language,
      collectedParams: {
        ...context.collectedParams,
        ...(transition.collectedParams ?? {}),
      },
      messageHistory: updatedHistory.slice(-20),
    };
  }
}
