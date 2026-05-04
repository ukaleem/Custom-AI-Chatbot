import { createLlmProvider, UnconfiguredLlmProvider } from './llm.factory';

describe('LLM Factory', () => {
  describe('createLlmProvider', () => {
    it('returns an OpenAI provider for provider=openai', () => {
      const provider = createLlmProvider({ provider: 'openai', apiKey: 'sk-test-key-00000000000000' });
      expect(provider).toBeDefined();
      expect(provider.isConfigured()).toBe(true);
    });

    it('returns an Anthropic provider for provider=anthropic', () => {
      const provider = createLlmProvider({ provider: 'anthropic', apiKey: 'sk-ant-test-key-0000000000' });
      expect(provider).toBeDefined();
      expect(provider.isConfigured()).toBe(true);
    });

    it('returns a Gemini provider for provider=gemini', () => {
      const provider = createLlmProvider({ provider: 'gemini', apiKey: 'AIza-test-key-000000000000' });
      expect(provider).toBeDefined();
      expect(provider.isConfigured()).toBe(true);
    });

    it('returns a Mistral provider for provider=mistral', () => {
      const provider = createLlmProvider({ provider: 'mistral', apiKey: 'test-mistral-key-0000000000' });
      expect(provider).toBeDefined();
      expect(provider.isConfigured()).toBe(true);
    });

    it('throws for unknown provider', () => {
      expect(() =>
        createLlmProvider({ provider: 'unknown' as any, apiKey: 'key' }),
      ).toThrow('Unsupported LLM provider');
    });
  });

  describe('UnconfiguredLlmProvider', () => {
    let provider: UnconfiguredLlmProvider;
    beforeEach(() => { provider = new UnconfiguredLlmProvider(); });

    it('isConfigured() returns false', () => {
      expect(provider.isConfigured()).toBe(false);
    });

    it('chat() returns a demo string (not throws)', async () => {
      const result = await provider.chat([], '');
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('embed() returns a zero-vector of length 1536', async () => {
      const vec = await provider.embed('test');
      expect(vec).toHaveLength(1536);
      expect(vec.every(v => v === 0)).toBe(true);
    });

    it('detectLanguage() returns "en"', async () => {
      expect(await provider.detectLanguage('hello')).toBe('en');
    });

    it('chat() returns different demo responses as conversation grows', async () => {
      const r0 = await provider.chat([], '');
      const r1 = await provider.chat([{ role: 'user', content: 'hi' }], '');
      expect(r0).not.toBe(r1);
    });
  });
});
