# Agent Handoff — Custom AI Chatbot Platform

> **READ THIS FIRST.** This file gives any new agent everything needed to understand the project and start working immediately without reading the entire codebase.

---

## What This Project Is

A **multi-tenant SaaS AI chatbot platform** that acts as a professional tourist guide. The first client is **Catania City Pass** — a tourist app for Catania, Italy. The bot asks structured questions (how many hours do you have? what do you prefer? do you want food?) and then recommends only places registered in that company's database. It embeds on any website or Ionic/Angular app via a 2-line snippet.

**The business model:** We sell the bot as a service to tourism companies. Each company gets their own isolated knowledge base, admin dashboard, and embeddable widget.

---

## Working Branch

```
claude/catania-ai-bot-MctDj
```

Always develop on this branch. Never push to `main` without explicit instruction.

---

## Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Monorepo | Nx 19 | Manages api + admin + widget in one repo |
| Backend | NestJS (TypeScript) | Modular, decorator-based, great for REST+WebSocket |
| Main DB | MongoDB (Mongoose) | Flexible schema for POI/attraction data |
| Vector DB | Qdrant | Per-tenant namespaced vector collections for RAG |
| Cache/Sessions | Redis | Fast session state for conversation flow |
| RAG Framework | LangChain.js | LLM-agnostic RAG pipeline |
| LLM | Abstracted | Client provides their own API key (OpenAI/Anthropic/Gemini/Mistral) |
| Admin UI | Angular | Same stack as client's Ionic app |
| Widget | Angular Web Component | Embeds on any website |
| Billing | Stripe | (Sprint 7) |

---

## Local Development Setup

```bash
# 1. Start databases
npm run docker:up          # MongoDB + Qdrant + Redis

# 2. Set environment
cp .env.example .env       # fill in SUPER_ADMIN_KEY at minimum

# 3. Run the API
npm run start:api:dev      # ts-node dev server on :3000

# API:    http://localhost:3000/api/v1
# Docs:   http://localhost:3000/api/docs   ← Swagger UI
# Health: http://localhost:3000/api/v1/health
```

---

## Current Project State

| Sprint | Name | Status |
|--------|------|--------|
| Sprint 1 | Foundation | ✅ COMPLETE |
| Sprint 2 | Data Layer & RAG Pipeline | ✅ COMPLETE |
| Sprint 3 | LLM Abstraction & Bot Flow Engine | ✅ COMPLETE |
| Sprint 4 | Chat API & Session Management | ✅ COMPLETE |
| Sprint 5 | Admin Dashboard | ✅ COMPLETE |
| Sprint 6 | Embeddable Widget | ✅ COMPLETE |
| Sprint 7 | Billing & SaaS Management | 🚀 NEXT |
| Sprint 8 | Testing, Security & Deployment | ⬜ PLANNED |

---

## What Sprint 3 Built (COMPLETE)

### New Libraries

```
libs/llm-providers/src/
├── openai.provider.ts      # GPT-4o + text-embedding-3-small
├── anthropic.provider.ts   # Claude Sonnet (no embeddings — uses OpenAI for RAG)
├── gemini.provider.ts      # Gemini 1.5 Flash + text-embedding-004
├── mistral.provider.ts     # Mistral Large + mistral-embed
├── llm.factory.ts          # createLlmProvider() + UnconfiguredLlmProvider
└── index.ts

libs/bot-core/src/
├── flow-engine.ts          # FlowEngine: routes states, auto-advances to GENERATE_PLAN
├── prompts/
│   └── system.prompt.ts    # buildSystemPrompt() + buildPlanPrompt()
├── utils/
│   ├── language-detect.ts  # Regex heuristics (it/de/fr/es) + LLM fallback
│   └── sanitize.ts         # Blocks 8 prompt injection patterns
├── states/
│   ├── greeting.state.ts         # GREETING
│   ├── ask-duration.state.ts     # ASK_DURATION
│   ├── ask-preference.state.ts   # ASK_PREFERENCE
│   ├── ask-food.state.ts         # ASK_FOOD
│   ├── ask-food-style.state.ts   # ASK_FOOD_STYLE
│   ├── generate-plan.state.ts    # GENERATE_PLAN — calls RetrievalFn callback
│   ├── follow-up.state.ts        # FOLLOW_UP — uses message history context
│   └── out-of-scope.state.ts     # OUT_OF_SCOPE
└── index.ts
```

### New API Modules

```
apps/api/src/modules/
├── llm/
│   ├── llm.service.ts      # forTenant(id) → ILLMProvider
│   └── llm.module.ts
└── settings/
    ├── dto/update-bot-config.dto.ts
    ├── settings.controller.ts   # PUT /settings/llm  +  PUT /settings/bot
    └── settings.module.ts
```

### New Settings Endpoints (all behind ApiKeyGuard `x-api-key`)
```
GET    /api/v1/settings           → botConfig + plan + usage
PUT    /api/v1/settings/llm       → Set provider, apiKey, model
PUT    /api/v1/settings/bot       → Update botName, greeting, colors, language
```

### Key Architectural Decisions in Sprint 3

1. **RetrievalFn pattern** — `GeneratePlanState` receives a callback `(params) => Promise<IAttractionResult[]>` — keeps `bot-core` framework-agnostic (no NestJS imports inside the library)
2. **Auto-advance** — When any state returns `nextState: 'GENERATE_PLAN'`, the `FlowEngine` immediately calls `GeneratePlanState` without waiting for another user message
3. **Prompt injection** — Every user input passes through `sanitize()` before hitting any state handler
4. **LLM key security** — `llmConfig.apiKey` has `select: false` in Mongoose — never returned in any query by default

---

## What to Build Next — Sprint 4

**Goal:** Full REST + WebSocket chat API. Sessions persisted in MongoDB.

See full task list: `project-progress/sprints/sprint-04.md`

### Key files to create in Sprint 4:
```
apps/api/src/modules/chat/
├── schemas/
│   ├── conversation.schema.ts    # sessionId, tenantId, state, collectedParams, messages[]
│   └── message.schema.ts        # role, content, timestamp, quickReplies
├── session.service.ts           # create, load, save, expire sessions
├── chat.service.ts              # orchestrates FlowEngine + RetrievalService
├── chat.controller.ts           # POST /chat/session, POST /chat/message
├── chat.gateway.ts              # WebSocket gateway
└── chat.module.ts
```

**Important:** `ChatService` is where `FlowEngine` is instantiated with the `RetrievalFn`:
```typescript
const engine = new FlowEngine(
  (params) => this.retrievalService.search({ ... })
);
```

---

## Key Design Decisions

1. **Tenant isolation** — Every query is scoped to `tenantId`. Qdrant collections: `attractions_{tenantId}`.
2. **API key auth** — `ApiKeyGuard` injects full `TenantDocument` as `req.tenant`. All services use `req.tenant._id`.
3. **LLM keys belong to clients** — Each tenant stores their own provider + API key with `select: false`.
4. **Bot flow is a state machine** — GREETING → ASK_DURATION → ASK_PREFERENCE → ASK_FOOD → ASK_FOOD_STYLE → GENERATE_PLAN → FOLLOW_UP.
5. **Multi-language** — Bot auto-detects language via heuristics + LLM fallback. System prompt instructs always respond in user's language.
6. **Out-of-scope refusal** — `FollowUpState` detects off-topic messages and routes to `OutOfScopeState`.

---

## Important: Don't Break These

- `apps/api/src/modules/auth/api-key.guard.ts` — Core security.
- `libs/shared-types/src/index.ts` — The shared type contract.
- `tsconfig.base.json` — Path aliases for all 3 libs must stay mapped.
- Tenant `isActive` check — Never bypass in guards.
- `llmConfig.apiKey` has `select: false` — Always use `.select('+llmConfig')` when you need it.

---

## Project Progress Files

| File | Purpose |
|------|---------|
| `AGENT-HANDOFF.md` | **This file** — start here every session |
| `ROADMAP.md` | All 8 sprints, every task, completion status |
| `ARCHITECTURE.md` | Full file tree, module map, data flow diagrams |
| `sprints/sprint-01.md` | Sprint 1 completed |
| `sprints/sprint-02.md` | Sprint 2 completed |
| `sprints/sprint-03.md` | Sprint 3 completed |
| `sprints/sprint-04.md` | Sprint 4 — NEXT |
