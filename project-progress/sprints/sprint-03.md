# Sprint 3 — LLM Abstraction & Bot Flow Engine ⬜ PLANNED

**Duration:** Week 5–6  
**Depends on:** Sprint 2 ✅ (RAG retrieval working)  
**Branch:** `claude/catania-ai-bot-MctDj`

---

## Goal

The bot has a brain. It asks the 4 guided questions in the user's detected language, then queries the RAG pipeline and returns a personalised plan using only registered attractions.

**Deliverable:** A call to the flow engine with a session context processes user input → returns the correct next question or final plan. English and Italian both work. Out-of-scope questions get a polite refusal.

---

## Tasks

### LLM Providers Library (`libs/llm-providers/`)

| # | Task | File | Status |
|---|------|------|--------|
| 1 | Lib scaffold (project.json + tsconfigs) | `libs/llm-providers/project.json`, `tsconfig*.json` | ⬜ |
| 2 | OpenAI provider | `libs/llm-providers/src/openai.provider.ts` | ⬜ |
| 3 | Anthropic provider | `libs/llm-providers/src/anthropic.provider.ts` | ⬜ |
| 4 | Google Gemini provider | `libs/llm-providers/src/gemini.provider.ts` | ⬜ |
| 5 | Mistral provider | `libs/llm-providers/src/mistral.provider.ts` | ⬜ |
| 6 | LLM factory (resolve by tenant config) | `libs/llm-providers/src/llm.factory.ts` | ⬜ |
| 7 | Library index | `libs/llm-providers/src/index.ts` | ⬜ |

### Tenant LLM Config (extend Sprint 1 schema)

| # | Task | File | Status |
|---|------|------|--------|
| 8 | Add `llmConfig` to Tenant schema | `apps/api/src/modules/tenants/schemas/tenant.schema.ts` | ⬜ |
| 9 | LLM config DTO | `apps/api/src/modules/tenants/dto/update-llm-config.dto.ts` | ⬜ |
| 10 | LLM config update endpoint | `PUT /api/v1/tenants/:id/llm-config` in `tenant.controller.ts` | ⬜ |

### Bot Core Library (`libs/bot-core/`)

| # | Task | File | Status |
|---|------|------|--------|
| 11 | Lib scaffold (project.json + tsconfigs) | `libs/bot-core/project.json`, `tsconfig*.json` | ⬜ |
| 12 | Language detection utility | `libs/bot-core/src/utils/language-detect.ts` | ⬜ |
| 13 | Input sanitizer (prompt injection protection) | `libs/bot-core/src/utils/sanitize.ts` | ⬜ |
| 14 | System prompt (tourist guide persona) | `libs/bot-core/src/prompts/system.prompt.ts` | ⬜ |
| 15 | Greeting state | `libs/bot-core/src/states/greeting.state.ts` | ⬜ |
| 16 | Ask duration state | `libs/bot-core/src/states/ask-duration.state.ts` | ⬜ |
| 17 | Ask preference state | `libs/bot-core/src/states/ask-preference.state.ts` | ⬜ |
| 18 | Ask food state | `libs/bot-core/src/states/ask-food.state.ts` | ⬜ |
| 19 | Ask food style state | `libs/bot-core/src/states/ask-food-style.state.ts` | ⬜ |
| 20 | Generate plan state | `libs/bot-core/src/states/generate-plan.state.ts` | ⬜ |
| 21 | Follow-up state | `libs/bot-core/src/states/follow-up.state.ts` | ⬜ |
| 22 | Out-of-scope handler | `libs/bot-core/src/states/out-of-scope.state.ts` | ⬜ |
| 23 | Flow engine (state machine orchestrator) | `libs/bot-core/src/flow-engine.ts` | ⬜ |
| 24 | Library index | `libs/bot-core/src/index.ts` | ⬜ |

### Path Aliases

| # | Task | File | Status |
|---|------|------|--------|
| 25 | Add new lib path aliases | `tsconfig.base.json` (add `@custom-ai-chatbot/bot-core`, `@custom-ai-chatbot/llm-providers`) | ⬜ |

---

## Bot Flow State Machine

```
User opens chat
       ↓
  GREETING ──────────── Detect language. Greet user in their language.
       ↓                Ask: "What would you like to do in Catania?"
  ASK_DURATION ────────  "How many hours do you have available?"
       ↓                Quick replies: 1h / 2h / 3h / Full day
  ASK_PREFERENCE ──────  "What do you prefer?"
       ↓                Quick replies: Culture / Entertainment / City Tour
  ASK_FOOD ─────────── "Would you also like to eat?"
       ↓                Quick replies: Yes / No
  ASK_FOOD_STYLE ───── (only if food=Yes) "How do you prefer to eat?"
       ↓                Quick replies: Sitting (restaurant) / Walking (street food)
  GENERATE_PLAN ──────  RAG query with all collected params
       ↓                Returns itinerary with ONLY registered attractions
  FOLLOW_UP ──────────  "Any questions about a specific place?"
                        Can loop back or end session
```

Any message that is off-topic → **OUT_OF_SCOPE**: politely apologise and redirect.

---

## LLM Provider Interface (already in shared-types)

```typescript
// libs/shared-types/src/bot-flow.types.ts — already defined
interface ILLMProvider {
  chat(messages: ILLMMessage[], systemPrompt: string): Promise<string>;
  embed(text: string): Promise<number[]>;
  detectLanguage(text: string): Promise<string>;
  isConfigured(): boolean;
}
```

All 4 providers must implement this interface.

## Tenant LLM Config Schema Addition

```typescript
// Fields to add to Tenant schema
llmConfig: {
  provider: 'openai' | 'anthropic' | 'gemini' | 'mistral';
  apiKey: string;          // encrypted at rest (never returned in API)
  model?: string;          // e.g. "gpt-4o", "claude-3-5-sonnet-20241022"
  embeddingModel?: string; // e.g. "text-embedding-3-small"
}
```

**Security:** The `apiKey` field must be excluded from all GET responses via `select('-llmConfig.apiKey')`.

---

## New Dependencies to Install

```bash
npm install openai @anthropic-ai/sdk @google/generative-ai @mistralai/mistralai
```

---

## Definition of Done

- [ ] `flow-engine.ts` processes all 5 happy-path states correctly
- [ ] In English: bot asks all questions, generates a plan
- [ ] In Italian: bot responds entirely in Italian throughout
- [ ] Off-topic question (e.g. "What's the weather?") → polite refusal
- [ ] `ILLMProvider.isConfigured()` returns `false` when no API key → graceful error
- [ ] No LLM API key hardcoded — all come from tenant config
- [ ] TypeScript compiles with no errors
