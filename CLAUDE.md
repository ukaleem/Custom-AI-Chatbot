# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Infrastructure (start before developing)
npm run docker:up          # Start MongoDB, Qdrant, Redis via Docker Compose
npm run docker:down        # Stop containers
npm run docker:logs        # Stream container logs

# Development
npm run start:api          # Serve API via Nx (with watch/rebuild)
npm run start:api:dev      # Direct ts-node server (faster cold start, no Nx overhead)

# Build
npm run build:api          # Production Webpack build → dist/apps/api

# Quality
npm run test               # Run all Jest tests across the monorepo
npm run lint               # Run ESLint across all projects

# Single project targeting (Nx)
npx nx test api            # Run tests for the api app only
npx nx test shared-types   # Run tests for a specific lib
npx nx lint api            # Lint a single project
```

## Architecture

This is an **Nx 19 monorepo** for a multi-tenant SaaS AI chatbot platform. The backend is a **NestJS 10** API; there is no frontend app yet.

```
apps/api/          # NestJS application (the only runnable app)
libs/shared-types/ # Shared TypeScript interfaces imported as @custom-ai-chatbot/shared-types
```

### Five-Layer Design

1. **LLM Abstraction** — provider-agnostic interface; switch between OpenAI GPT-4o, Anthropic Claude, Google Gemini Flash, or Mistral via `LLM_PROVIDER` env var with no code changes.
2. **RAG Pipeline** — tourist/destination data ingested as vector embeddings into Qdrant; queries retrieve only spots registered to the requesting tenant.
3. **Guided Flow Engine** — state machine that collects user preferences before issuing a RAG query. States: `GREETING → ASK_DURATION → ASK_PREFERENCE → ASK_FOOD → ASK_FOOD_STYLE → GENERATE_PLAN → FOLLOW_UP / OUT_OF_SCOPE`.
4. **Multi-Tenant SaaS** — each tenant has an isolated Qdrant namespace, per-tenant LLM config, and plan-based usage limits (starter: 500 sessions/mo, pro: 5,000, enterprise: unlimited). Stripe billing is planned.
5. **Integration Layer** — REST API (`api/v1` prefix) + planned WebSocket; embeddable JS widget and mobile SDK wrappers planned.

### API Module Structure (`apps/api/src/modules/`)

- `auth/` — Two-tier auth: tenant API key via `x-api-key` header, super-admin key via `x-admin-key` header.
- `tenants/` — Tenant CRUD, billing limits, and per-tenant bot configuration.
- `health/` — Health-check endpoints (via `@nestjs/terminus`).

### Shared Types (`libs/shared-types/src/`)

- `tenant.types.ts` — `ITenant`, `TenantPlan`, `IBotConfig`
- `bot-flow.types.ts` — `BotFlowState` enum, `IFlowContext`
- `conversation.types.ts`, `attraction.types.ts` — domain models

Import shared types with the path alias: `@custom-ai-chatbot/shared-types`.

### Infrastructure (Docker Compose)

| Service  | Image            | Port(s)     |
|----------|------------------|-------------|
| MongoDB  | mongo:7.0        | 27017       |
| Qdrant   | qdrant/qdrant    | 6333, 6334  |
| Redis    | redis:7.2-alpine | 6379        |

All services have health checks configured. Redis is used for session caching; Qdrant for vector similarity search.

### Environment Variables

Copy `.env.example` to `.env.local`. Key variables:

- `MONGODB_URI` — MongoDB connection string
- `REDIS_HOST` / `REDIS_PORT`
- `QDRANT_URL`
- `SUPER_ADMIN_KEY` — master auth key
- `CORS_ORIGINS` — comma-separated whitelist
- `LLM_PROVIDER` — `openai` | `anthropic` | `gemini` | `mistral`

### Build Notes

- Production build uses **Webpack 5** with **SWC** compiler (configured in `apps/api/webpack.config.js`).
- TypeScript targets ES2021, module format CommonJS, with decorator metadata enabled for NestJS.
- Nx caches `build`, `lint`, and `test` targets — use `--skip-nx-cache` if you need a clean run.
