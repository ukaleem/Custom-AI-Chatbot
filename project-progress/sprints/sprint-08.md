# Sprint 8 — Testing, Security & Deployment ⬜ PLANNED

**Duration:** Week 15–16  
**Depends on:** All previous sprints ✅  
**Branch:** `claude/catania-ai-bot-MctDj`

---

## Goal

Stable v1.0 ready to sell to Company B and C. The system is tested, secure, documented, and deployed.

**Deliverable:** Production deployment running. CI/CD pipeline green. Security audit passed. Company B can be onboarded in under 1 hour.

---

## Tasks

### Unit Tests

| # | Task | File | Status |
|---|------|------|--------|
| 1 | Flow engine unit tests | `libs/bot-core/src/flow-engine.spec.ts` | ⬜ |
| 2 | RAG retrieval service unit tests | `apps/api/src/modules/rag/retrieval.service.spec.ts` | ⬜ |
| 3 | LLM factory unit tests | `libs/llm-providers/src/llm.factory.spec.ts` | ⬜ |
| 4 | API key guard unit tests | `apps/api/src/modules/auth/api-key.guard.spec.ts` | ⬜ |
| 5 | Tenant service unit tests | `apps/api/src/modules/tenants/tenant.service.spec.ts` | ⬜ |
| 6 | Attraction service unit tests | `apps/api/src/modules/attractions/attraction.service.spec.ts` | ⬜ |
| 7 | Chat service unit tests | `apps/api/src/modules/chat/chat.service.spec.ts` | ⬜ |

### Integration / E2E Tests

| # | Task | File | Status |
|---|------|------|--------|
| 8 | Full EN conversation flow e2e | `apps/api/test/chat-en.e2e-spec.ts` | ⬜ |
| 9 | Full IT conversation flow e2e | `apps/api/test/chat-it.e2e-spec.ts` | ⬜ |
| 10 | Tenant isolation e2e (cross-tenant access denied) | `apps/api/test/tenant-isolation.e2e-spec.ts` | ⬜ |
| 11 | Plan limit enforcement e2e | `apps/api/test/plan-limits.e2e-spec.ts` | ⬜ |

### Security Hardening

| # | Task | File | Status |
|---|------|------|--------|
| 12 | Input sanitization on all DTOs | Review all DTO validators | ⬜ |
| 13 | Prompt injection protection | `libs/bot-core/src/utils/sanitize.ts` | ⬜ |
| 14 | Tenant isolation audit (verify no cross-tenant queries) | Full service review | ⬜ |
| 15 | Rate limiting configuration tuning | `apps/api/src/app.module.ts` | ⬜ |
| 16 | Helmet headers | Add `@fastify/helmet` or `helmet` | ⬜ |
| 17 | LLM API key encryption at rest | Encrypt `llmConfig.apiKey` in MongoDB | ⬜ |
| 18 | OWASP top 10 checklist review | Manual review + documented | ⬜ |

### Docker & Deployment

| # | Task | File | Status |
|---|------|------|--------|
| 19 | API production Dockerfile | `apps/api/Dockerfile` | ⬜ |
| 20 | Production docker-compose | `docker-compose.prod.yml` | ⬜ |
| 21 | `.dockerignore` | `.dockerignore` | ⬜ |
| 22 | Health check in Dockerfile | `HEALTHCHECK` instruction | ⬜ |

### CI/CD Pipeline

| # | Task | File | Status |
|---|------|------|--------|
| 23 | GitHub Actions CI (lint + test on PR) | `.github/workflows/ci.yml` | ⬜ |
| 24 | GitHub Actions CD (deploy on push to main) | `.github/workflows/deploy.yml` | ⬜ |
| 25 | Environment secrets setup guide | `docs/deployment-guide.md` | ⬜ |

### Documentation

| # | Task | File | Status |
|---|------|------|--------|
| 26 | Deployment guide (Railway / Render / DigitalOcean) | `docs/deployment-guide.md` | ⬜ |
| 27 | Final client onboarding review | `docs/client-onboarding.md` (update) | ⬜ |
| 28 | API changelog v1.0 | `docs/CHANGELOG.md` | ⬜ |

---

## Security Checklist

```
[ ] SQL/NoSQL injection — all DB queries use parameterised Mongoose methods
[ ] XSS — bot responses are HTML-escaped before sending to widget
[ ] Prompt injection — user input is sanitised before being added to LLM context
[ ] IDOR — every DB query includes tenantId filter (never trust client-provided IDs alone)
[ ] API key brute force — rate limit on all endpoints
[ ] Sensitive data exposure — apiKey excluded from GET, llmConfig.apiKey never returned
[ ] CORS — only configured origins allowed
[ ] HTTPS — enforced in production
[ ] Dependency audit — npm audit clean
```

---

## Dockerfile (API)

```dockerfile
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build:api

FROM node:22-alpine AS runner
WORKDIR /app
COPY --from=builder /app/dist/apps/api ./dist
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://localhost:3000/api/v1/health || exit 1
CMD ["node", "dist/main.js"]
```

---

## Definition of Done

- [ ] `nx run-many --target=test --all` passes with >80% coverage
- [ ] E2E tests pass against a real MongoDB + Qdrant + Redis in Docker
- [ ] Security checklist fully checked
- [ ] `docker build` succeeds for API
- [ ] GitHub Actions CI goes green on test PR
- [ ] Deployed to staging environment and verified working
- [ ] Company B onboarding takes < 1 hour using the docs
