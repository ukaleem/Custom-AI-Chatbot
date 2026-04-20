# Sprint 1 — Foundation ✅ COMPLETE

**Duration:** Week 1–2  
**Branch:** `claude/catania-ai-bot-MctDj`  
**Commit:** `7244836`

---

## Goal

Runnable monorepo, databases connected via Docker, tenant authentication working.  
**Deliverable:** `POST /tenants` creates a company and returns an API key. API key auth works on all endpoints.

---

## Completed Tasks

| # | Task | File Created | Notes |
|---|------|-------------|-------|
| 1 | ✅ Nx monorepo scaffold | `nx.json`, `tsconfig.base.json`, `package.json` | Nx 19, TypeScript path aliases configured |
| 2 | ✅ Docker compose | `docker-compose.yml` | MongoDB 7, Qdrant latest, Redis 7.2-alpine — all with health checks |
| 3 | ✅ Environment config | `.env.example` | All vars documented: DB, Redis, Qdrant, SUPER_ADMIN_KEY, ALLOWED_ORIGINS |
| 4 | ✅ Jest preset | `jest.preset.js` | Root jest config for Nx workspace |
| 5 | ✅ NestJS bootstrap | `apps/api/src/main.ts` | Global prefix `/api/v1`, ValidationPipe, CORS, Swagger at `/api/docs` |
| 6 | ✅ Root app module | `apps/api/src/app.module.ts` | ConfigModule (global), MongooseModule (async factory) |
| 7 | ✅ Typed config | `apps/api/src/config/configuration.ts` | port, nodeEnv, database.mongoUri, redis, qdrant, security.superAdminKey |
| 8 | ✅ Health module | `apps/api/src/modules/health/health.module.ts` | TerminusModule |
| 9 | ✅ Health endpoint | `apps/api/src/modules/health/health.controller.ts` | `GET /api/v1/health` — MongoDB ping check |
| 10 | ✅ Super admin guard | `apps/api/src/modules/auth/super-admin.guard.ts` | Validates `x-admin-key` header vs `SUPER_ADMIN_KEY` env |
| 11 | ✅ API key guard | `apps/api/src/modules/auth/api-key.guard.ts` | Validates `x-api-key`, injects `TenantDocument` as `req.tenant` |
| 12 | ✅ CurrentTenant decorator | `apps/api/src/modules/auth/current-tenant.decorator.ts` | `@CurrentTenant()` extracts tenant from request |
| 13 | ✅ Auth module | `apps/api/src/modules/auth/auth.module.ts` | Exports SuperAdminGuard |
| 14 | ✅ Tenant schema | `apps/api/src/modules/tenants/schemas/tenant.schema.ts` | Fields: name, slug, apiKey, adminEmail, plan, isActive, botConfig, usage |
| 15 | ✅ Create tenant DTO | `apps/api/src/modules/tenants/dto/create-tenant.dto.ts` | Validation: slug regex `/^[a-z0-9-]+$/` |
| 16 | ✅ Update tenant DTO | `apps/api/src/modules/tenants/dto/update-tenant.dto.ts` | PartialType + isActive + botConfig |
| 17 | ✅ Tenant service | `apps/api/src/modules/tenants/tenant.service.ts` | `generateApiKey()` → `cac_<32-char-uuid>`, `incrementSessionCount()` |
| 18 | ✅ Tenant controller | `apps/api/src/modules/tenants/tenant.controller.ts` | 6 endpoints, all behind SuperAdminGuard |
| 19 | ✅ Tenant module | `apps/api/src/modules/tenants/tenant.module.ts` | Exports TenantsService (needed by ApiKeyGuard in Sprint 4+) |
| 20 | ✅ Shared types: tenant | `libs/shared-types/src/tenant.types.ts` | ITenant, TenantPlan, IBotConfig, ITenantUsage, PLAN_LIMITS |
| 21 | ✅ Shared types: attraction | `libs/shared-types/src/attraction.types.ts` | IAttraction, AttractionCategory, IMultiLangText, IOpeningHours |
| 22 | ✅ Shared types: conversation | `libs/shared-types/src/conversation.types.ts` | IConversation, IMessage, IChatRequest, IChatResponse, IQuickReply |
| 23 | ✅ Shared types: bot flow | `libs/shared-types/src/bot-flow.types.ts` | BotFlowState, IFlowContext, IStateTransition, ILLMProvider |
| 24 | ✅ Shared types index | `libs/shared-types/src/index.ts` | Re-exports all types |
| 25 | ✅ Shared types lib config | `libs/shared-types/project.json`, `tsconfig.json`, `tsconfig.lib.json` | |
| 26 | ✅ API app config | `apps/api/project.json`, `tsconfig.json`, `tsconfig.app.json`, `webpack.config.js` | |
| 27 | ✅ Client onboarding guide | `docs/client-onboarding.md` | Step-by-step for Company A |
| 28 | ✅ Data format guide | `docs/data-format-guide.md` | JSON + CSV format for attractions, all categories |

---

## Working API Endpoints

```
GET  /api/v1/health                       → { status: "ok", mongodb: "up" }
POST /api/v1/tenants                      → { id, name, slug, apiKey: "cac_...", ... }
GET  /api/v1/tenants                      → [ ...tenants (apiKey excluded) ]
GET  /api/v1/tenants/:id                  → { ...tenant (apiKey excluded) }
PUT  /api/v1/tenants/:id                  → { ...updated tenant }
POST /api/v1/tenants/:id/regenerate-key   → { apiKey: "cac_..." }
DELETE /api/v1/tenants/:id                → 204 No Content (soft deactivate)

Swagger UI: http://localhost:3000/api/docs
```

---

## How to Test Sprint 1

```bash
# Start everything
npm run docker:up
cp .env.example .env   # Set SUPER_ADMIN_KEY=test123
npm run start:api:dev

# Create Company A (super-admin only)
curl -X POST http://localhost:3000/api/v1/tenants \
  -H "x-admin-key: test123" \
  -H "Content-Type: application/json" \
  -d '{"name":"Catania City Pass","slug":"catania-city-pass","adminEmail":"admin@cataniacitypass.com"}'

# Response includes apiKey: "cac_..." → save this for Sprint 2+
```

---

## Known Limitations (by design — addressed in later sprints)

- `ApiKeyGuard` is defined but not yet used on any public endpoint (Chat module in Sprint 4 will use it)
- No LLM config stored on Tenant yet (added in Sprint 3)
- No attraction data endpoints yet (Sprint 2)
- No actual bot conversation yet (Sprints 3–4)
