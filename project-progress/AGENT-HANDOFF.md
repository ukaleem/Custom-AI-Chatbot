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
| RAG Framework | LangChain.js | LLM-agnostic RAG pipeline (Sprint 2) |
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
| Sprint 2 | Data Layer & RAG Pipeline | 🚀 READY TO START |
| Sprint 3 | LLM Abstraction & Bot Flow Engine | ⬜ PLANNED |
| Sprint 4 | Chat API & Session Management | ⬜ PLANNED |
| Sprint 5 | Admin Dashboard | ⬜ PLANNED |
| Sprint 6 | Embeddable Widget | ⬜ PLANNED |
| Sprint 7 | Billing & SaaS Management | ⬜ PLANNED |
| Sprint 8 | Testing, Security & Deployment | ⬜ PLANNED |

---

## What Sprint 1 Built (COMPLETE)

### Files Created
```
apps/api/src/
├── main.ts                          # NestJS bootstrap + Swagger setup
├── app.module.ts                    # Root module (MongoDB + Config)
├── config/configuration.ts          # Typed env config
└── modules/
    ├── health/
    │   ├── health.controller.ts     # GET /api/v1/health
    │   └── health.module.ts
    ├── auth/
    │   ├── api-key.guard.ts         # Validates x-api-key header → injects req.tenant
    │   ├── super-admin.guard.ts     # Validates x-admin-key header
    │   ├── current-tenant.decorator.ts   # @CurrentTenant() param decorator
    │   └── auth.module.ts
    └── tenants/
        ├── schemas/tenant.schema.ts # Mongoose schema: name, slug, apiKey, plan, botConfig, usage
        ├── dto/create-tenant.dto.ts
        ├── dto/update-tenant.dto.ts
        ├── tenant.service.ts        # CRUD + generateApiKey() → "cac_<uuid>"
        ├── tenant.controller.ts     # All endpoints use SuperAdminGuard
        └── tenant.module.ts

libs/shared-types/src/
├── tenant.types.ts       # ITenant, TenantPlan, IBotConfig, ITenantUsage
├── attraction.types.ts   # IAttraction, AttractionCategory, IMultiLangText
├── conversation.types.ts # IConversation, IMessage, IChatRequest, IChatResponse
├── bot-flow.types.ts     # BotFlowState, IFlowContext, ILLMProvider interface
└── index.ts              # Re-exports all types
```

### Working API Endpoints (all behind SuperAdminGuard `x-admin-key` header)
```
POST   /api/v1/tenants              → Creates tenant, returns apiKey (save it!)
GET    /api/v1/tenants              → List all tenants (apiKey excluded)
GET    /api/v1/tenants/:id          → Get single tenant
PUT    /api/v1/tenants/:id          → Update tenant / botConfig
POST   /api/v1/tenants/:id/regenerate-key → New API key
DELETE /api/v1/tenants/:id          → Deactivate tenant (soft delete)
GET    /api/v1/health               → MongoDB health check
```

---

## What to Build Next — Sprint 2

**Goal:** Companies can push their attraction data via API. RAG retrieval works per tenant.

See full task list: `project-progress/sprints/sprint-02.md`

### Key files to create in Sprint 2:
```
apps/api/src/modules/attractions/
├── schemas/attraction.schema.ts
├── dto/create-attraction.dto.ts
├── dto/update-attraction.dto.ts
├── dto/bulk-import.dto.ts
├── attraction.service.ts
├── attraction.controller.ts
└── attraction.module.ts

apps/api/src/modules/rag/
├── qdrant.service.ts        # Qdrant client, create/query collections
├── embedding.service.ts     # Text → vector embeddings
├── retrieval.service.ts     # RAG query: params → relevant attractions
└── rag.module.ts
```

---

## Key Design Decisions

1. **Tenant isolation** — Every query is scoped to `tenantId`. The bot can NEVER return data from another tenant. Qdrant uses collection naming: `attractions_{tenantId}`.

2. **API key auth** — The `ApiKeyGuard` looks up the API key in MongoDB, injects the full `TenantDocument` as `req.tenant`. All downstream services use `req.tenant._id` to scope queries.

3. **LLM keys belong to clients** — We never store our own LLM credentials. Each tenant stores their own provider + API key in their `Tenant` document (added in Sprint 3).

4. **Bot flow is a state machine** — The conversation goes through fixed states: GREETING → ASK_DURATION → ASK_PREFERENCE → ASK_FOOD → ASK_FOOD_STYLE → GENERATE_PLAN. Only after collecting all params does it hit the RAG pipeline.

5. **Multi-language first** — All attraction names/descriptions use `IMultiLangText` (en/it/de/fr/es). The bot auto-detects user language and responds in kind.

6. **Out-of-scope refusal** — If a user asks anything unrelated to tourist guidance, the bot politely declines and redirects to tourist topics.

---

## Important: Don't Break These

- `apps/api/src/modules/auth/api-key.guard.ts` — Core security. All bot endpoints must use this guard.
- `libs/shared-types/src/index.ts` — The shared type contract. Changes affect all apps.
- `tsconfig.base.json` — Path alias `@custom-ai-chatbot/shared-types` must stay mapped.
- Tenant `isActive` check — The API key guard also validates `isActive`. Never bypass this.

---

## Project Progress Files

| File | Purpose |
|------|---------|
| `AGENT-HANDOFF.md` | **This file** — start here every session |
| `ROADMAP.md` | All 8 sprints, every task, completion status |
| `ARCHITECTURE.md` | Full file tree, module map, data flow diagrams |
| `sprints/sprint-01.md` | Sprint 1 completed task log |
| `sprints/sprint-02.md` | Sprint 2 task list (ready to start) |
| `sprints/sprint-03.md` | Sprint 3 planned tasks |
| `sprints/sprint-04.md` | Sprint 4 planned tasks |
| `sprints/sprint-05.md` | Sprint 5 planned tasks |
| `sprints/sprint-06.md` | Sprint 6 planned tasks |
| `sprints/sprint-07.md` | Sprint 7 planned tasks |
| `sprints/sprint-08.md` | Sprint 8 planned tasks |
