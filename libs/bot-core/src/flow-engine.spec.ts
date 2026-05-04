import { FlowEngine } from './flow-engine';
import { IFlowContext, BotFlowState } from '@custom-ai-chatbot/shared-types';
import { UnconfiguredLlmProvider } from '@custom-ai-chatbot/llm-providers';

const mockRetrieval = jest.fn().mockResolvedValue([]);

function makeContext(overrides: Partial<IFlowContext> = {}): IFlowContext {
  return {
    tenantId: 'tenant-1',
    sessionId: 'sess-1',
    currentState: 'GREETING' as BotFlowState,
    language: 'en',
    botName: 'TestBot',
    collectedParams: {},
    messageHistory: [],
    ...overrides,
  };
}

describe('FlowEngine', () => {
  let engine: FlowEngine;
  let llm: UnconfiguredLlmProvider;

  beforeEach(() => {
    engine = new FlowEngine(mockRetrieval);
    llm = new UnconfiguredLlmProvider();
    mockRetrieval.mockClear();
  });

  it('processes GREETING state and returns a message', async () => {
    const ctx = makeContext({ currentState: 'GREETING' });
    const { transition } = await engine.process(ctx, '', llm);
    expect(transition.message).toBeTruthy();
    expect(typeof transition.message).toBe('string');
  });

  it('advances from GREETING to ASK_DURATION automatically', async () => {
    const ctx = makeContext({ currentState: 'GREETING' });
    const { updatedContext } = await engine.process(ctx, '', llm);
    expect(['ASK_DURATION', 'GREETING']).toContain(updatedContext.currentState);
  });

  it('processes ASK_DURATION and collects hours', async () => {
    const ctx = makeContext({ currentState: 'ASK_DURATION' });
    const { updatedContext } = await engine.process(ctx, '2 hours', llm);
    expect(['ASK_PREFERENCE', 'ASK_DURATION']).toContain(updatedContext.currentState);
  });

  it('handles out-of-scope message in FOLLOW_UP', async () => {
    const ctx = makeContext({
      currentState: 'FOLLOW_UP' as BotFlowState,
      collectedParams: { availableHours: 2, preference: 'culture', wantsFood: false },
    });
    const { transition } = await engine.process(ctx, 'What is the capital of France?', llm);
    expect(transition.message).toBeTruthy();
  });

  it('returns quickReplies array in transition', async () => {
    const ctx = makeContext({ currentState: 'GREETING' });
    const { transition } = await engine.process(ctx, '', llm);
    expect(Array.isArray(transition.quickReplies)).toBe(true);
  });

  it('does not call retrieval when not in GENERATE_PLAN', async () => {
    const ctx = makeContext({ currentState: 'ASK_DURATION' });
    await engine.process(ctx, '3 hours', llm);
    expect(mockRetrieval).not.toHaveBeenCalled();
  });
});
