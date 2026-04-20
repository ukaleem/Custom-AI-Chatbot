# Architecture Reference

> This document is the technical map of the entire platform. Consult it when designing new modules or trying to understand how pieces connect.

---

## System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                    CUSTOM AI CHATBOT PLATFORM                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────────────────┐   │
│  │   Website A  │  │   Website B  │  │   Ionic/Angular App     │   │
│  │  (2-line     │  │  (Company B) │  │   (Company A mobile)    │   │
│  │   embed)     │  │              │  │                         │   │
│  └──────┬───────┘  └──────┬───────┘  └────────────┬────────────┘   │
│         │                 │                        │               │
│         └─────────────────┴────────────────────────┘               │
│                           │                                         │
│               ┌───────────▼──────────┐                             │
│               │  Embeddable Widget   │  ← Sprint 6                 │
│               │  (Angular Elements   │                             │
│               │   Web Component)     │                             │
│               └───────────┬──────────┘                             │
│                           │  REST/WebSocket                         │
│               ┌───────────▼──────────────────────────────────┐     │
│               │              NestJS API                       │     │
│               │  /api/v1/                                     │     │
│               │  ├── health/        ← Sprint 1 ✅             │     │
│               │  ├── tenants/       ← Sprint 1 ✅             │     │
│               │  ├── attractions/   ← Sprint 2                │     │
│               │  ├── rag/           ← Sprint 2                │     │
│               │  ├── chat/          ← Sprint 4                │     │
│               │  ├── admin-auth/    ← Sprint 5                │     │
│               │  ├── analytics/     ← Sprint 5                │     │
│               │  └── billing/       ← Sprint 7                │     │
│               └────────┬─────────────────────┬────────────────┘     │
│                        │                     │                      │
│          ┌─────────────▼───┐   ┌─────────────▼──────────────────┐  │
│          │    MongoDB      │   │         Qdrant                  │  │
│          │  ─ Tenant       │   │   Collections per tenant:       │  │
│          │  ─ Conversation │   │   attractions_{tenantId}        │  │
│          │  ─ Attraction   │   │   (vector embeddings)           │  │
│          └─────────────────┘   └────────────────────────────────┘  │
│                        │                                            │
│          ┌─────────────▼───┐                                        │
│          │     Redis       │                                        │
│          │  ─ Session state│                                        │
│          │  ─ Rate limits  │                                        │
│          └─────────────────┘                                        │
│                                                                       │
│          ┌──────────────────────────────┐                           │
│          │   Angular Admin Dashboard    │  ← Sprint 5               │
│          │   (per-tenant login)         │                           │
│          └──────────────────────────────┘                           │
│                                                                       │
│  External: LLM Providers (client provides own keys)                  │
│  ┌──────────┐ ┌──────────┐ ┌─────────┐ ┌──────────┐               │
│  │  OpenAI  │ │Anthropic │ │ Gemini  │ │ Mistral  │               │
│  └──────────┘ └──────────┘ └─────────┘ └──────────┘               │
│                                                                       │
│  External: Stripe (Sprint 7)                                         │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Complete File Tree (Final State — all 8 sprints)

```
custom-ai-chatbot/
│
├── apps/
│   │
│   ├── api/                                    # NestJS Backend
│   │   ├── src/
│   │   │   ├── main.ts                         # Bootstrap + Swagger
│   │   │   ├── app.module.ts                   # Root module
│   │   │   ├── config/
│   │   │   │   └── configuration.ts            # Typed env config
│   │   │   └── modules/
│   │   │       ├── health/                     # Sprint 1 ✅
│   │   │       ├── auth/                       # Sprint 1 ✅
│   │   │       ├── tenants/                    # Sprint 1 ✅
│   │   │       ├── attractions/                # Sprint 2
│   │   │       │   ├── schemas/
│   │   │       │   ├── dto/
│   │   │       │   ├── attraction.service.ts
│   │   │       │   ├── attraction.controller.ts
│   │   │       │   └── attraction.module.ts
│   │   │       ├── rag/                        # Sprint 2
│   │   │       │   ├── qdrant.service.ts
│   │   │       │   ├── embedding.service.ts
│   │   │       │   ├── retrieval.service.ts
│   │   │       │   └── rag.module.ts
│   │   │       ├── chat/                       # Sprint 4
│   │   │       │   ├── schemas/
│   │   │       │   ├── guards/
│   │   │       │   ├── session.service.ts
│   │   │       │   ├── bot.service.ts
│   │   │       │   ├── chat.service.ts
│   │   │       │   ├── chat.controller.ts
│   │   │       │   ├── chat.gateway.ts
│   │   │       │   └── chat.module.ts
│   │   │       ├── admin-auth/                 # Sprint 5
│   │   │       │   ├── jwt.strategy.ts
│   │   │       │   ├── jwt-auth.guard.ts
│   │   │       │   └── admin-auth.module.ts
│   │   │       ├── analytics/                  # Sprint 5
│   │   │       │   ├── analytics.service.ts
│   │   │       │   ├── analytics.controller.ts
│   │   │       │   └── analytics.module.ts
│   │   │       └── billing/                    # Sprint 7
│   │   │           ├── stripe.service.ts
│   │   │           ├── usage.service.ts
│   │   │           ├── billing.cron.ts
│   │   │           ├── plans.config.ts
│   │   │           ├── billing.controller.ts
│   │   │           └── billing.module.ts
│   │   ├── test/                               # Sprint 8 e2e tests
│   │   ├── project.json
│   │   ├── tsconfig*.json
│   │   ├── webpack.config.js
│   │   └── Dockerfile                          # Sprint 8
│   │
│   ├── admin/                                  # Angular Admin Dashboard (Sprint 5)
│   │   └── src/app/
│   │       ├── pages/
│   │       │   ├── login/
│   │       │   ├── dashboard/
│   │       │   ├── attractions/
│   │       │   │   ├── list/
│   │       │   │   ├── form/
│   │       │   │   └── import/
│   │       │   ├── conversations/
│   │       │   │   └── detail/
│   │       │   ├── settings/
│   │       │   │   ├── bot/
│   │       │   │   ├── llm/
│   │       │   │   └── widget/
│   │       │   ├── billing/
│   │       │   └── super-admin/
│   │       ├── components/
│   │       ├── services/
│   │       ├── guards/
│   │       └── interceptors/
│   │
│   └── widget/                                 # Embeddable Chat Widget (Sprint 6)
│       └── src/
│           ├── components/
│           │   ├── chat-launcher/
│           │   ├── chat-window/
│           │   ├── message-bubble/
│           │   ├── quick-replies/
│           │   ├── typing-indicator/
│           │   └── bot-avatar/
│           ├── services/
│           │   ├── chat.service.ts
│           │   ├── theme.service.ts
│           │   ├── i18n.service.ts
│           │   └── config.service.ts
│           ├── config/
│           │   └── widget.config.ts
│           └── widget.element.ts               # Angular Elements wrapper
│
├── libs/
│   ├── shared-types/                           # Sprint 1 ✅
│   │   └── src/
│   │       ├── tenant.types.ts
│   │       ├── attraction.types.ts
│   │       ├── conversation.types.ts
│   │       ├── bot-flow.types.ts
│   │       └── index.ts
│   │
│   ├── llm-providers/                          # Sprint 3
│   │   └── src/
│   │       ├── openai.provider.ts
│   │       ├── anthropic.provider.ts
│   │       ├── gemini.provider.ts
│   │       ├── mistral.provider.ts
│   │       ├── llm.factory.ts
│   │       └── index.ts
│   │
│   └── bot-core/                               # Sprint 3
│       └── src/
│           ├── states/
│           │   ├── greeting.state.ts
│           │   ├── ask-duration.state.ts
│           │   ├── ask-preference.state.ts
│           │   ├── ask-food.state.ts
│           │   ├── ask-food-style.state.ts
│           │   ├── generate-plan.state.ts
│           │   ├── follow-up.state.ts
│           │   └── out-of-scope.state.ts
│           ├── prompts/
│           │   └── system.prompt.ts
│           ├── utils/
│           │   ├── language-detect.ts
│           │   └── sanitize.ts
│           ├── flow-engine.ts
│           └── index.ts
│
├── docs/
│   ├── client-onboarding.md                    # Sprint 1 ✅
│   ├── data-format-guide.md                    # Sprint 1 ✅
│   ├── postman-collection.json                 # Sprint 4
│   ├── widget-html-embed.md                    # Sprint 6
│   ├── ionic-integration.md                    # Sprint 6
│   ├── deployment-guide.md                     # Sprint 8
│   └── CHANGELOG.md                            # Sprint 8
│
├── project-progress/                           # This folder
│   ├── AGENT-HANDOFF.md
│   ├── ROADMAP.md
│   ├── ARCHITECTURE.md
│   └── sprints/
│       ├── sprint-01.md  ✅
│       ├── sprint-02.md  🚀
│       ├── sprint-03.md  ⬜
│       ├── sprint-04.md  ⬜
│       ├── sprint-05.md  ⬜
│       ├── sprint-06.md  ⬜
│       ├── sprint-07.md  ⬜
│       └── sprint-08.md  ⬜
│
├── .github/workflows/                          # Sprint 8
│   ├── ci.yml
│   └── deploy.yml
│
├── docker-compose.yml                          # Sprint 1 ✅
├── docker-compose.prod.yml                     # Sprint 8
├── nx.json                                     # Sprint 1 ✅
├── package.json                                # Sprint 1 ✅
├── tsconfig.base.json                          # Sprint 1 ✅
├── jest.preset.js                              # Sprint 1 ✅
└── .env.example                                # Sprint 1 ✅
```

---

## Data Flow — Chat Conversation

```
1. Tourist opens widget
        ↓
2. Widget: POST /chat/session  (x-api-key: cac_xxx)
        ↓
3. ApiKeyGuard → validates key → injects Tenant into request
        ↓
4. SessionService.create() → saves Conversation to MongoDB → returns sessionId
        ↓
5. FlowEngine.init() → GREETING state → detects language → returns greeting message
        ↓
6. Tourist types reply → Widget: POST /chat/message { sessionId, message }
        ↓
7. FlowEngine.process(context, input) → matches current state
        ↓
8a. If collecting params (states 2-5): extract answer, advance state, return next question
        ↓
8b. If GENERATE_PLAN:
        → Build retrieval query from collectedParams
        → RetrievalService.search(tenantId, query, filters)
        → Qdrant returns top-5 matching attractions for THIS tenant
        → LLM formats attractions into a natural language itinerary
        → Return final plan
        ↓
9. SessionService.appendMessage() → saves to MongoDB
        ↓
10. Response: { message, quickReplies, flowState, isComplete }
```

---

## Multi-Tenant Isolation Model

```
Each company = 1 Tenant document in MongoDB
             = 1 Qdrant collection: "attractions_{tenantId}"
             = 1 Admin login (own dashboard)
             = 1 API key (their website/app uses this)

Data rule: EVERY query must include tenantId filter.
           The Qdrant collection name encodes tenantId.
           The MongoDB queries always include { tenantId: req.tenant._id }
           No endpoint returns data without first resolving tenant from API key.
```

---

## Key Environment Variables

| Variable | Where Used | Required |
|----------|-----------|----------|
| `MONGODB_URI` | API: DB connection | Yes |
| `REDIS_HOST` / `REDIS_PORT` | API: sessions, rate limits | Yes |
| `QDRANT_URL` | API: vector search | Yes |
| `SUPER_ADMIN_KEY` | API: super-admin endpoints | Yes |
| `ALLOWED_ORIGINS` | API: CORS | Production |
| `JWT_SECRET` | API: admin auth (Sprint 5) | Sprint 5+ |
| `STRIPE_SECRET_KEY` | API: billing (Sprint 7) | Sprint 7+ |
| `STRIPE_WEBHOOK_SECRET` | API: webhook validation | Sprint 7+ |

**Not stored in .env:** LLM API keys (belong to each tenant, stored encrypted in MongoDB)

---

## TypeScript Path Aliases

All aliases defined in `tsconfig.base.json`:

| Alias | Resolves To |
|-------|-------------|
| `@custom-ai-chatbot/shared-types` | `libs/shared-types/src/index.ts` |
| `@custom-ai-chatbot/bot-core` | `libs/bot-core/src/index.ts` *(Sprint 3)* |
| `@custom-ai-chatbot/llm-providers` | `libs/llm-providers/src/index.ts` *(Sprint 3)* |
