# Project Roadmap — Custom AI Chatbot Platform

> **Legend:** ✅ Done &nbsp;|&nbsp; 🔄 In Progress &nbsp;|&nbsp; 🚀 Ready to Start &nbsp;|&nbsp; ⬜ Planned &nbsp;|&nbsp; ❌ Blocked

---

## Milestone Overview

| # | Sprint | Goal | Status | Target |
|---|--------|------|--------|--------|
| 1 | Foundation | Monorepo + DB + Tenant auth working | ✅ COMPLETE | Week 1–2 |
| 2 | Data Layer & RAG | Attraction data in, vector search out | ✅ COMPLETE | Week 3–4 |
| 3 | LLM + Bot Flow | Bot asks guided questions, answers from DB | ✅ COMPLETE | Week 5–6 |
| 4 | Chat API | Stable REST + WebSocket chat API | ✅ COMPLETE | Week 7–8 |
| 5 | Admin Dashboard | Company can manage their data + bot | ⬜ PLANNED | Week 9–10 |
| 6 | Embeddable Widget | 2-line embed for website + Ionic app | ⬜ PLANNED | Week 11–12 |
| 7 | Billing & SaaS | Stripe billing, usage limits, super-admin | ⬜ PLANNED | Week 13–14 |
| 8 | Testing & Deploy | Production-ready, CI/CD, documented | ⬜ PLANNED | Week 15–16 |

---

## Sprint 1 — Foundation ✅ COMPLETE

**Deliverable:** `POST /tenants` creates a company, gets an API key. API key auth works. All DBs run via Docker.

| Task | File(s) | Status |
|------|---------|--------|
| Nx monorepo scaffold | `nx.json`, `tsconfig.base.json`, `package.json` | ✅ |
| Docker compose (MongoDB + Qdrant + Redis) | `docker-compose.yml` | ✅ |
| Environment config | `.env.example`, `apps/api/src/config/configuration.ts` | ✅ |
| NestJS app bootstrap with Swagger | `apps/api/src/main.ts` | ✅ |
| Root app module with MongoDB | `apps/api/src/app.module.ts` | ✅ |
| Health check endpoint | `apps/api/src/modules/health/` | ✅ |
| Tenant MongoDB schema | `apps/api/src/modules/tenants/schemas/tenant.schema.ts` | ✅ |
| Tenant CRUD endpoints | `apps/api/src/modules/tenants/tenant.controller.ts` | ✅ |
| API key generation (`cac_<uuid>`) | `apps/api/src/modules/tenants/tenant.service.ts` | ✅ |
| API key auth guard (`x-api-key`) | `apps/api/src/modules/auth/api-key.guard.ts` | ✅ |
| Super admin guard (`x-admin-key`) | `apps/api/src/modules/auth/super-admin.guard.ts` | ✅ |
| `@CurrentTenant()` decorator | `apps/api/src/modules/auth/current-tenant.decorator.ts` | ✅ |
| Shared types library | `libs/shared-types/src/` (5 files) | ✅ |
| Client onboarding guide | `docs/client-onboarding.md` | ✅ |
| Attraction data format guide | `docs/data-format-guide.md` | ✅ |

---

## Sprint 2 — Data Layer & RAG Pipeline ✅ COMPLETE

**Deliverable:** Company A pushes Catania attractions via API. Similarity search returns only their registered spots filtered by category.

| Task | File(s) | Status |
|------|---------|--------|
| Attraction MongoDB schema | `apps/api/src/modules/attractions/schemas/attraction.schema.ts` | ✅ |
| Create attraction DTO | `apps/api/src/modules/attractions/dto/create-attraction.dto.ts` | ✅ |
| Update attraction DTO | `apps/api/src/modules/attractions/dto/update-attraction.dto.ts` | ✅ |
| Bulk import DTO | `apps/api/src/modules/attractions/dto/bulk-import.dto.ts` | ✅ |
| Attraction CRUD service | `apps/api/src/modules/attractions/attraction.service.ts` | ✅ |
| Attraction REST controller | `apps/api/src/modules/attractions/attraction.controller.ts` | ✅ |
| Bulk import endpoint (100 max) | `POST /api/v1/attractions/bulk` | ✅ |
| Re-index endpoint | `POST /api/v1/attractions/reindex` | ✅ |
| Attractions module | `apps/api/src/modules/attractions/attraction.module.ts` | ✅ |
| Qdrant service (create/delete collections) | `apps/api/src/modules/rag/qdrant.service.ts` | ✅ |
| Embedding service (text → vector) | `apps/api/src/modules/rag/embedding.service.ts` | ✅ |
| Retrieval service (RAG query per tenant) | `apps/api/src/modules/rag/retrieval.service.ts` | ✅ |
| RAG module | `apps/api/src/modules/rag/rag.module.ts` | ✅ |
| Auto-embed on attraction save | Hook in `attraction.service.ts` | ✅ |
| Category + duration filter on retrieval | `retrieval.service.ts` | ✅ |
| Register attractions + RAG modules in AppModule | `apps/api/src/app.module.ts` | ✅ |

---

## Sprint 3 — LLM Abstraction & Bot Flow Engine ✅ COMPLETE

**Deliverable:** Bot conversation works end-to-end. Asks all 4 guided questions in the user's language. Only registered attractions are suggested.

| Task | File(s) | Status |
|------|---------|--------|
| `ILLMProvider` interface + `RetrievalFn` type | `libs/shared-types/src/bot-flow.types.ts` | ✅ |
| OpenAI provider | `libs/llm-providers/src/openai.provider.ts` | ✅ |
| Anthropic provider | `libs/llm-providers/src/anthropic.provider.ts` | ✅ |
| Google Gemini provider | `libs/llm-providers/src/gemini.provider.ts` | ✅ |
| Mistral provider | `libs/llm-providers/src/mistral.provider.ts` | ✅ |
| LLM factory (switch by tenant config) | `libs/llm-providers/src/llm.factory.ts` | ✅ |
| LLM providers lib `index.ts` | `libs/llm-providers/src/index.ts` | ✅ |
| Store LLM config per tenant in DB | `llmConfig` field in `Tenant` schema (select: false) | ✅ |
| LLM settings endpoint | `PUT /api/v1/settings/llm` | ✅ |
| Bot settings endpoint | `PUT /api/v1/settings/bot` | ✅ |
| Settings module | `apps/api/src/modules/settings/` | ✅ |
| LLM service (forTenant factory) | `apps/api/src/modules/llm/llm.service.ts` | ✅ |
| LLM module | `apps/api/src/modules/llm/llm.module.ts` | ✅ |
| Flow engine core (auto-advance to GENERATE_PLAN) | `libs/bot-core/src/flow-engine.ts` | ✅ |
| GREETING state | `libs/bot-core/src/states/greeting.state.ts` | ✅ |
| ASK_DURATION state | `libs/bot-core/src/states/ask-duration.state.ts` | ✅ |
| ASK_PREFERENCE state | `libs/bot-core/src/states/ask-preference.state.ts` | ✅ |
| ASK_FOOD state | `libs/bot-core/src/states/ask-food.state.ts` | ✅ |
| ASK_FOOD_STYLE state | `libs/bot-core/src/states/ask-food-style.state.ts` | ✅ |
| GENERATE_PLAN state (calls retrieval callback) | `libs/bot-core/src/states/generate-plan.state.ts` | ✅ |
| FOLLOW_UP state | `libs/bot-core/src/states/follow-up.state.ts` | ✅ |
| OUT_OF_SCOPE handler | `libs/bot-core/src/states/out-of-scope.state.ts` | ✅ |
| Bot core lib `index.ts` | `libs/bot-core/src/index.ts` | ✅ |
| Language auto-detect (heuristic + LLM fallback) | `libs/bot-core/src/utils/language-detect.ts` | ✅ |
| Prompt injection protection | `libs/bot-core/src/utils/sanitize.ts` | ✅ |
| System prompt (tourist guide persona) | `libs/bot-core/src/prompts/system.prompt.ts` | ✅ |
| Update `tsconfig.base.json` path aliases | Added `@custom-ai-chatbot/bot-core` + `@custom-ai-chatbot/llm-providers` | ✅ |

---

## Sprint 4 — Chat API & Session Management ✅ COMPLETE

**Deliverable:** Full REST + WebSocket chat API. Sessions persisted in MongoDB.

| Task | File(s) | Status |
|------|---------|--------|
| Conversation MongoDB schema (TTL 24h, messages sub-doc) | `apps/api/src/modules/chat/schemas/conversation.schema.ts` | ✅ |
| Session service (create/load/save/end) | `apps/api/src/modules/chat/session.service.ts` | ✅ |
| Chat service (FlowEngine + RetrievalFn bridge) | `apps/api/src/modules/chat/chat.service.ts` | ✅ |
| Chat REST controller | `apps/api/src/modules/chat/chat.controller.ts` | ✅ |
| `POST /chat/session` — create session + greeting | `chat.controller.ts` | ✅ |
| `POST /chat/message` — send message | `chat.controller.ts` | ✅ |
| `GET /chat/session/:id/history` | `chat.controller.ts` | ✅ |
| `PATCH /chat/session/:id/end` — close session | `chat.controller.ts` | ✅ |
| WebSocket gateway (socket.io, namespace /chat) | `apps/api/src/modules/chat/chat.gateway.ts` | ✅ |
| WS auth via x-api-key on connection | `chat.gateway.ts` | ✅ |
| Session persistence (full history + TTL) | MongoDB TTL index in `conversation.schema.ts` | ✅ |
| Plan limit enforcement (block at monthly limit) | `chat.service.ts#startSession` | ✅ |
| Rate limiting (60 req/min global) | `@nestjs/throttler` in `app.module.ts` | ✅ |
| Tenant isolation (sessionId + tenantId scoped) | `session.service.ts#findBySessionId` | ✅ |
| Chat module + register in AppModule | `apps/api/src/modules/chat/chat.module.ts` | ✅ |
| RetrievalService: accept ILLMProvider for embeddings | `apps/api/src/modules/rag/retrieval.service.ts` | ✅ |

---

## Sprint 5 — Admin Dashboard ⬜ PLANNED

**Deliverable:** Company A logs in, manages attractions, views conversations, configures bot.

| Task | File(s) | Status |
|------|---------|--------|
| Admin JWT auth endpoint | `POST /api/v1/admin/login` | ⬜ |
| JWT strategy + guard in API | `apps/api/src/modules/admin-auth/` | ⬜ |
| Angular admin app scaffold | `apps/admin/` (project.json, tsconfig, app.module.ts) | ⬜ |
| Shared Angular services lib | `libs/admin-shared/` | ⬜ |
| Auth service + login page | `apps/admin/src/app/pages/login/` | ⬜ |
| Auth guard (CanActivate) | `apps/admin/src/app/guards/auth.guard.ts` | ⬜ |
| Main layout (sidebar + header) | `apps/admin/src/app/components/layout/` | ⬜ |
| Dashboard overview page | `apps/admin/src/app/pages/dashboard/` | ⬜ |
| Attractions list page | `apps/admin/src/app/pages/attractions/list/` | ⬜ |
| Add/edit attraction form | `apps/admin/src/app/pages/attractions/form/` | ⬜ |
| Bulk CSV import UI | `apps/admin/src/app/pages/attractions/import/` | ⬜ |
| Conversations viewer page | `apps/admin/src/app/pages/conversations/` | ⬜ |
| Bot settings page (name, greeting, colors) | `apps/admin/src/app/pages/settings/bot/` | ⬜ |
| LLM settings page (provider, API key) | `apps/admin/src/app/pages/settings/llm/` | ⬜ |
| Widget code snippet generator page | `apps/admin/src/app/pages/settings/widget/` | ⬜ |
| Analytics API endpoints | `apps/api/src/modules/analytics/` | ⬜ |
| API service layer (HttpClient wrappers) | `apps/admin/src/app/services/` | ⬜ |
| Responsive design (mobile-ready) | All admin pages | ⬜ |

---

## Sprint 6 — Embeddable Widget ⬜ PLANNED

**Deliverable:** 2 lines of code to embed bot on any website or Ionic/Angular app.

| Task | File(s) | Status |
|------|---------|--------|
| Angular widget app scaffold | `apps/widget/` (project.json, tsconfig) | ⬜ |
| Chat launcher component (floating button) | `apps/widget/src/components/chat-launcher/` | ⬜ |
| Chat window component (main panel) | `apps/widget/src/components/chat-window/` | ⬜ |
| Message bubble component | `apps/widget/src/components/message-bubble/` | ⬜ |
| Quick replies component (option buttons) | `apps/widget/src/components/quick-replies/` | ⬜ |
| Typing indicator component | `apps/widget/src/components/typing-indicator/` | ⬜ |
| Chat service (WebSocket + REST fallback) | `apps/widget/src/services/chat.service.ts` | ⬜ |
| i18n service (en, it, de, fr, es) | `apps/widget/src/services/i18n.service.ts` | ⬜ |
| Theme service (primaryColor, logo) | `apps/widget/src/services/theme.service.ts` | ⬜ |
| Web Component wrapper `<catania-bot>` | `apps/widget/src/widget.element.ts` | ⬜ |
| Script tag bundle builder | `apps/widget/webpack.config.js` | ⬜ |
| npm package structure | `apps/widget/package.json` (publishable) | ⬜ |
| Ionic/Angular integration guide | `docs/ionic-integration.md` | ⬜ |
| Widget config: tenantId, language, theme | `apps/widget/src/config/widget.config.ts` | ⬜ |
| Serve widget bundle via API | `apps/api/src/modules/widget/` (static serve) | ⬜ |

---

## Sprint 7 — Billing & SaaS Management ⬜ PLANNED

**Deliverable:** You can charge companies monthly. Track usage. Block overage. See all tenants in super-admin panel.

| Task | File(s) | Status |
|------|---------|--------|
| Stripe SDK installation | `package.json` | ⬜ |
| Stripe service | `apps/api/src/modules/billing/stripe.service.ts` | ⬜ |
| Plan definitions (Starter/Pro/Enterprise) | `apps/api/src/modules/billing/plans.config.ts` | ⬜ |
| Create Stripe customer on tenant creation | Hook in `tenant.service.ts` | ⬜ |
| Create subscription endpoint | `POST /api/v1/billing/subscribe` | ⬜ |
| Upgrade/downgrade plan endpoint | `PUT /api/v1/billing/plan` | ⬜ |
| Stripe webhook handler | `POST /api/v1/billing/webhook` | ⬜ |
| Usage tracking (sessions + messages) | `apps/api/src/modules/billing/usage.service.ts` | ⬜ |
| Plan limit enforcement (block at limit) | Middleware/guard in chat module | ⬜ |
| Monthly usage reset (cron job) | `apps/api/src/modules/billing/billing.cron.ts` | ⬜ |
| Billing page in admin dashboard | `apps/admin/src/app/pages/billing/` | ⬜ |
| Usage bar + upgrade prompt in admin | `apps/admin/src/app/components/usage-bar/` | ⬜ |
| Super-admin panel (all tenants, revenue) | `apps/admin/src/app/pages/super-admin/` | ⬜ |
| Billing module + register in AppModule | `apps/api/src/modules/billing/billing.module.ts` | ⬜ |

---

## Sprint 8 — Testing, Security & Deployment ⬜ PLANNED

**Deliverable:** Stable v1.0 ready to sell to Company B and C.

| Task | File(s) | Status |
|------|---------|--------|
| Unit test: flow engine | `libs/bot-core/src/flow-engine.spec.ts` | ⬜ |
| Unit test: RAG retrieval service | `apps/api/src/modules/rag/retrieval.service.spec.ts` | ⬜ |
| Unit test: LLM abstraction/factory | `libs/llm-providers/src/llm.factory.spec.ts` | ⬜ |
| Unit test: API key guard | `apps/api/src/modules/auth/api-key.guard.spec.ts` | ⬜ |
| Unit test: tenant service | `apps/api/src/modules/tenants/tenant.service.spec.ts` | ⬜ |
| Integration test: full EN conversation flow | `apps/api/test/chat-en.e2e-spec.ts` | ⬜ |
| Integration test: full IT conversation flow | `apps/api/test/chat-it.e2e-spec.ts` | ⬜ |
| Integration test: tenant isolation | `apps/api/test/tenant-isolation.e2e-spec.ts` | ⬜ |
| Security: input sanitization | All DTOs + chat endpoints | ⬜ |
| Security: prompt injection protection | `libs/bot-core/src/utils/sanitize.ts` | ⬜ |
| Security: tenant isolation audit | Review all service methods | ⬜ |
| Security: rate limiting tuning | `apps/api/src/app.module.ts` | ⬜ |
| Docker production image | `apps/api/Dockerfile` | ⬜ |
| Docker production compose | `docker-compose.prod.yml` | ⬜ |
| GitHub Actions CI pipeline | `.github/workflows/ci.yml` | ⬜ |
| GitHub Actions CD pipeline | `.github/workflows/deploy.yml` | ⬜ |
| Deployment guide (Railway / Render) | `docs/deployment-guide.md` | ⬜ |
| Final client documentation | `docs/` complete review | ⬜ |

---

## Progress Summary

```
Sprint 1  ████████████████████ 100%  ✅ COMPLETE    (16/16 tasks)
Sprint 2  ████████████████████ 100%  ✅ COMPLETE    (16/16 tasks)
Sprint 3  ████████████████████ 100%  ✅ COMPLETE    (26/26 tasks)
Sprint 4  ████████████████████ 100%  ✅ COMPLETE    (17/17 tasks)
Sprint 5  ░░░░░░░░░░░░░░░░░░░░   0%  🚀 NEXT        ( 0/15 tasks)
Sprint 6  ░░░░░░░░░░░░░░░░░░░░   0%  ⬜ PLANNED      ( 0/15 tasks)
Sprint 7  ░░░░░░░░░░░░░░░░░░░░   0%  ⬜ PLANNED      ( 0/14 tasks)
Sprint 8  ░░░░░░░░░░░░░░░░░░░░   0%  ⬜ PLANNED      ( 0/18 tasks)
─────────────────────────────────────────────────────────────────
TOTAL     ██████████░░░░░░░░░░  54%                  (75/140 tasks)
```

---

*Last updated: Sprint 4 complete. Branch: `claude/catania-ai-bot-MctDj`*
