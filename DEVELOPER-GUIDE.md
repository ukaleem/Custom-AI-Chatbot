# Developer Guide — Custom AI Chatbot Platform v1.0

> **Author:** Kaleem Ullah — `ukaleem540@gmail.com`  
> **Branch:** `claude/catania-ai-bot-MctDj`  
> **Status:** ✅ All 8 Sprints Complete

---

## Table of Contents

1. [What Was Built](#1-what-was-built)
2. [Architecture Overview](#2-architecture-overview)
3. [Project Structure](#3-project-structure)
4. [Environment Setup](#4-environment-setup)
5. [Running Locally](#5-running-locally)
6. [All API Endpoints](#6-all-api-endpoints)
7. [Step-by-Step Testing Guide](#7-step-by-step-testing-guide)
8. [Admin Dashboard Guide](#8-admin-dashboard-guide)
9. [Super Admin Portal Guide](#9-super-admin-portal-guide)
10. [Widget Embed Guide](#10-widget-embed-guide)
11. [Billing & Plans](#11-billing--plans)
12. [Deployment](#12-deployment)
13. [Troubleshooting](#13-troubleshooting)

---

## 1. What Was Built

A **multi-tenant SaaS AI chatbot platform** that acts as an intelligent tourist guide. Companies embed the chatbot on their website in 2 lines of code. The bot conducts guided conversations, asking users about their time, preferences, and food interests — then recommends only that company's registered attractions using RAG (vector search).

### Sprints Completed

| Sprint | Feature | Key Files |
|--------|---------|-----------|
| 1 | Monorepo + DB + Multi-tenant auth | `apps/api/src/modules/auth/`, `modules/tenants/` |
| 2 | RAG Pipeline (Qdrant + embeddings) | `modules/rag/`, `modules/attractions/` |
| 3 | LLM Abstraction + Bot Flow Engine | `libs/llm-providers/`, `libs/bot-core/` |
| 4 | Chat REST API + WebSocket gateway | `modules/chat/` |
| 5 | Admin Dashboard (Angular) | `apps/admin/` |
| 6 | Embeddable Web Component widget | `apps/widget/` |
| 7 | Billing + Stripe + Usage limits | `modules/billing/`, `modules/super-admin/` |
| 8 | Tests + Security + Docker + CI/CD | `*.spec.ts`, `Dockerfile`, `.github/` |

---

## 2. Architecture Overview

```
┌──────────────────────────────────────────────────────────────────┐
│  CLIENT LAYER                                                    │
│  ┌────────────────┐  ┌────────────────┐  ┌──────────────────┐  │
│  │ Widget (Web    │  │ Admin Dashboard│  │  External API    │  │
│  │ Component)     │  │ (Angular SPA)  │  │  (curl/Swagger)  │  │
│  └───────┬────────┘  └───────┬────────┘  └────────┬─────────┘  │
└──────────┼───────────────────┼─────────────────────┼────────────┘
           │ HTTP + CORS       │ JWT Bearer           │ x-api-key /
           │ (null origin OK)  │ (admin-jwt)          │ x-admin-key
┌──────────▼───────────────────▼─────────────────────▼────────────┐
│  NESTJS API  (port 3000)                                        │
│                                                                 │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────────────┐  │
│  │ /widget/*   │  │ /admin/*     │  │ /super-admin/*        │  │
│  │ (public)    │  │ (JWT guard)  │  │ (super-admin-jwt)     │  │
│  └─────────────┘  └──────────────┘  └───────────────────────┘  │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────────────┐  │
│  │ /chat/*     │  │ /analytics/* │  │ /billing/*            │  │
│  │ (x-api-key) │  │ (JWT guard)  │  │ (JWT/super-admin-jwt) │  │
│  └─────────────┘  └──────────────┘  └───────────────────────┘  │
│                                                                 │
│  BOT ENGINE: GREETING→ASK_DURATION→ASK_PREFERENCE→ASK_FOOD     │
│              →ASK_FOOD_STYLE→GENERATE_PLAN→FOLLOW_UP           │
└─────────────────────────┬───────────────────────────────────────┘
                          │
        ┌─────────────────┼────────────────────┐
        ▼                 ▼                    ▼
  ┌──────────┐     ┌────────────┐      ┌───────────┐
  │ MongoDB  │     │  Qdrant    │      │   Redis   │
  │ (tenants,│     │  (vector   │      │ (sessions)│
  │ convs,   │     │  search)   │      │           │
  │ super-   │     │            │      │           │
  │ admins)  │     └────────────┘      └───────────┘
  └──────────┘
```

### Auth Flow Summary

| Who | Auth method | Where stored |
|-----|-------------|-------------|
| Bot users (chat) | `x-api-key: cac_xxx` | HTTP header |
| Tenant admin (dashboard) | JWT Bearer from `POST /admin/login` | localStorage |
| Super admin (portal) | JWT Bearer from `POST /super-admin/login` | sessionStorage |
| Swagger/API testing | `x-admin-key: SUPER_ADMIN_KEY` | HTTP header |

---

## 3. Project Structure

```
custom-ai-chatbot/
├── apps/
│   ├── api/                        ← NestJS backend
│   │   └── src/modules/
│   │       ├── auth/               ← ApiKeyGuard, SuperAdminGuard
│   │       ├── tenants/            ← Tenant CRUD, plan management
│   │       ├── attractions/        ← POI CRUD + Qdrant embedding
│   │       ├── rag/                ← Qdrant + embedding services
│   │       ├── llm/                ← LLM provider factory
│   │       ├── chat/               ← Chat REST + WebSocket
│   │       ├── settings/           ← Bot/LLM config (JWT protected)
│   │       ├── analytics/          ← Conversation analytics (JWT)
│   │       ├── widget/             ← Public widget API
│   │       ├── admin-auth/         ← Tenant admin JWT
│   │       ├── billing/            ← Stripe + usage + plans
│   │       └── super-admin/        ← Super admin JWT + portal API
│   ├── admin/                      ← Angular 19 admin SPA
│   │   └── src/app/pages/
│   │       ├── login/              ← Tenant admin login
│   │       ├── dashboard/          ← Analytics overview
│   │       ├── attractions/        ← CRUD + bulk CSV import
│   │       ├── conversations/      ← Session viewer
│   │       ├── settings/           ← Bot config, LLM key, widget snippet
│   │       ├── billing/            ← Usage bar + plan change
│   │       └── super-admin/        ← Super admin portal (own login)
│   └── widget/                     ← Web Component (chatbot.js)
│       └── src/
│           ├── chatbot.element.ts  ← <catania-bot> custom element
│           └── services/           ← chat, config, i18n, theme
├── libs/
│   ├── bot-core/                   ← Flow engine (state machine)
│   ├── llm-providers/              ← OpenAI/Anthropic/Gemini/Mistral
│   └── shared-types/               ← TypeScript interfaces
├── docker-compose.yml              ← Dev: MongoDB + Qdrant + Redis
├── docker-compose.prod.yml         ← Production with API container
├── apps/api/Dockerfile             ← Multi-stage production image
├── .github/workflows/
│   ├── ci.yml                      ← Lint + test + build on PR
│   └── deploy.yml                  ← Docker push on main
├── TESTING-GUIDE.md
└── DEVELOPER-GUIDE.md              ← This file
```

---

## 4. Environment Setup

Copy `.env.example` to `.env` and fill in:

```env
# ── Required ─────────────────────────────────────────────────
PORT=3000
NODE_ENV=development

MONGODB_URI=mongodb://localhost:27017/custom-ai-chatbot
REDIS_HOST=localhost
REDIS_PORT=6379
QDRANT_URL=http://localhost:6333

# Generate with: openssl rand -hex 32
SUPER_ADMIN_KEY=<raw key for Swagger x-admin-key header>
JWT_SECRET=<random secret for all JWT signing>

ALLOWED_ORIGINS=http://localhost:4200,http://localhost:8100

# ── Optional (for real AI responses) ─────────────────────────
OPENAI_API_KEY=sk-...          # tenant LLM key (set per-tenant via dashboard)

# ── Optional (for Stripe billing) ────────────────────────────
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_STARTER=price_...
STRIPE_PRICE_PRO=price_...

# ── Optional (super-admin seed override) ─────────────────────
SUPER_ADMIN_EMAIL=ukaleem540@gmail.com   # default
SUPER_ADMIN_PASSWORD=12345678            # default (change after first login!)
```

---

## 5. Running Locally

```bash
# 1. Install dependencies
npm install

# 2. Start databases (MongoDB, Qdrant, Redis)
npm run docker:up

# 3. Start the API (ts-node dev server)
npm run start:api:dev
# API:    http://localhost:3000/api/v1
# Docs:   http://localhost:3000/api/docs
# Health: http://localhost:3000/api/v1/health

# 4. Start admin dashboard
npx nx serve admin
# Opens: http://localhost:4200

# 5. Build widget (needed once for the chat button)
node apps/widget/build.js --production
# Output: dist/apps/widget/chatbot.js
# Served: http://localhost:3000/widget/chatbot.js

# 6. Run all tests
npx nx run-many --target=test --all
```

---

## 6. All API Endpoints

### Public Endpoints (no auth)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/health` | Health check |
| GET | `/widget/chatbot.js` | Widget bundle (JS) |
| GET | `/api/v1/widget/:slug/config` | Bot config for widget |
| POST | `/api/v1/widget/:slug/session` | Start chat via widget |
| POST | `/api/v1/widget/:slug/message` | Send message via widget |
| POST | `/api/v1/admin/login` | Tenant admin login |
| POST | `/api/v1/super-admin/login` | **Super admin login** |

### Tenant API Key Endpoints (`x-api-key: cac_xxx`)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/chat/session` | Start a chat session |
| POST | `/api/v1/chat/message` | Send a message |
| GET | `/api/v1/chat/session/:id/history` | Session history |
| PATCH | `/api/v1/chat/session/:id/end` | End session |
| GET | `/api/v1/attractions` | List attractions (paginated + search) |
| POST | `/api/v1/attractions` | Create attraction |
| POST | `/api/v1/attractions/bulk` | Bulk create (max 100) |
| GET | `/api/v1/attractions/:id` | Get one attraction |
| PUT | `/api/v1/attractions/:id` | Update attraction |
| DELETE | `/api/v1/attractions/:id` | Delete attraction |
| POST | `/api/v1/attractions/reindex` | Re-embed all into Qdrant |

### Tenant Admin JWT Endpoints (`Authorization: Bearer <admin-jwt>`)

> Get token from `POST /api/v1/admin/login`

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/settings` | Get bot config + LLM provider |
| PUT | `/api/v1/settings/bot` | Update bot name, greeting, color |
| PUT | `/api/v1/settings/llm` | Set LLM provider + API key |
| GET | `/api/v1/analytics/overview` | Session stats + language breakdown |
| GET | `/api/v1/analytics/conversations` | Paginated conversation list |
| GET | `/api/v1/analytics/conversations/:sessionId` | Full message thread |
| GET | `/api/v1/billing/usage` | Plan usage + remaining sessions |
| POST | `/api/v1/billing/subscribe` | Subscribe to a plan |
| PUT | `/api/v1/billing/plan` | Change plan |
| DELETE | `/api/v1/billing/subscription` | Cancel → downgrade to Starter |

### Super Admin JWT Endpoints (`Authorization: Bearer <super-admin-jwt>`)

> Get token from `POST /api/v1/super-admin/login`  
> Credentials: `ukaleem540@gmail.com` / `12345678`

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/super-admin/me` | Super-admin profile |
| GET | `/api/v1/super-admin/tenants` | All tenants with usage + MRR |
| PUT | `/api/v1/super-admin/password` | Change super-admin password |

### Super Admin Key Endpoints (`x-admin-key: SUPER_ADMIN_KEY`)

> For Swagger/curl/scripts — the raw `SUPER_ADMIN_KEY` from `.env`

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/tenants` | Create a new tenant |
| GET | `/api/v1/tenants` | List all tenants |
| GET | `/api/v1/tenants/:id` | Get one tenant |
| PUT | `/api/v1/tenants/:id` | Update tenant |
| POST | `/api/v1/tenants/:id/set-password` | Set tenant admin password |
| POST | `/api/v1/tenants/:id/regenerate-key` | Regenerate API key |
| DELETE | `/api/v1/tenants/:id` | Deactivate tenant |
| GET | `/api/v1/billing/admin/tenants` | All tenants with billing data |
| POST | `/api/v1/billing/admin/reset-usage/:tenantId` | Reset monthly usage |

---

## 7. Step-by-Step Testing Guide

### Prerequisites

```bash
npm run docker:up        # Start MongoDB + Qdrant + Redis
npm run start:api:dev    # Start API on :3000
```

---

### TEST 1 — Health Check

```bash
curl http://localhost:3000/api/v1/health
# Expected: {"status":"ok","info":{"mongodb":{"status":"up"}},...}
```

---

### TEST 2 — Create Tenant (Swagger or curl)

```bash
curl -X POST http://localhost:3000/api/v1/tenants \
  -H "x-admin-key: YOUR_SUPER_ADMIN_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Catania City Pass",
    "slug": "catania-city-pass",
    "adminEmail": "admin@catania.test",
    "plan": "pro"
  }'
# Expected: 201 with apiKey: "cac_..."
# ✅ SAVE the apiKey and _id
```

---

### TEST 3 — Set Tenant Admin Password

```bash
curl -X POST http://localhost:3000/api/v1/tenants/TENANT_ID/set-password \
  -H "x-admin-key: YOUR_SUPER_ADMIN_KEY" \
  -H "Content-Type: application/json" \
  -d '{"password": "12345678"}'
# Expected: 204 No Content
```

---

### TEST 4 — Tenant Admin Login

```bash
curl -X POST http://localhost:3000/api/v1/admin/login \
  -H "Content-Type: application/json" \
  -d '{"slug": "catania-city-pass", "password": "12345678"}'
# Expected: {"accessToken":"eyJ...","apiKey":"cac_...","tenant":{...}}
# ✅ SAVE the accessToken (admin JWT)
```

---

### TEST 5 — Super Admin Login

```bash
curl -X POST http://localhost:3000/api/v1/super-admin/login \
  -H "Content-Type: application/json" \
  -d '{"email": "ukaleem540@gmail.com", "password": "12345678"}'
# Expected: {"accessToken":"eyJ...","email":"ukaleem540@gmail.com","name":"Kaleem Ullah"}
# ✅ SAVE the accessToken (super-admin JWT)
```

---

### TEST 6 — Set LLM API Key (needed for real AI responses)

```bash
curl -X PUT http://localhost:3000/api/v1/settings/llm \
  -H "Authorization: Bearer ADMIN_JWT" \
  -H "Content-Type: application/json" \
  -d '{"provider": "openai", "apiKey": "sk-YOUR_OPENAI_KEY"}'
# Expected: {"message":"LLM configuration saved successfully"}
```

---

### TEST 7 — Add Attractions

```bash
curl -X POST http://localhost:3000/api/v1/attractions \
  -H "x-api-key: cac_YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": {"en": "Catania Cathedral"},
    "description": {"en": "Baroque cathedral in Piazza del Duomo"},
    "shortDescription": {"en": "Historic cathedral in Catania center"},
    "category": "culture",
    "address": "Piazza del Duomo, Catania",
    "location": {"lat": 37.5026, "lng": 15.0878},
    "priceRange": "free",
    "durationMinutes": 60,
    "isActive": true
  }'
# Expected: 201 with the created attraction
```

---

### TEST 8 — Full Chat Conversation

```bash
# Start session
curl -X POST http://localhost:3000/api/v1/chat/session \
  -H "x-api-key: cac_YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"language": "en"}'
# Expected: {"sessionId":"sess_xxx","message":"...","flowState":"ASK_DURATION",...}
# ✅ SAVE sessionId

# Send "2 hours"
curl -X POST http://localhost:3000/api/v1/chat/message \
  -H "x-api-key: cac_YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"sessionId": "sess_xxx", "message": "2 hours"}'
# Expected: flowState moves to ASK_PREFERENCE, quickReplies with emoji options

# Send preference
curl -X POST http://localhost:3000/api/v1/chat/message \
  -H "x-api-key: cac_YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"sessionId": "sess_xxx", "message": "culture"}'
# Expected: flowState moves to ASK_FOOD

# Answer food question
curl -X POST http://localhost:3000/api/v1/chat/message \
  -H "x-api-key: cac_YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"sessionId": "sess_xxx", "message": "yes"}'
# Expected: ASK_FOOD_STYLE → sitting/walking question

# Continue to get final plan
curl -X POST http://localhost:3000/api/v1/chat/message \
  -H "x-api-key: cac_YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"sessionId": "sess_xxx", "message": "sitting"}'
# Expected: GENERATE_PLAN → itinerary with your registered attractions!
```

---

### TEST 9 — Widget Chat (browser)

Open [test.html](test.html) in Chrome (file:// is OK — CORS allows null origin):

1. Green status bar: "✅ Connected — bot: Catania Guide"
2. Click the floating button → chat window opens
3. Bot greets you automatically
4. **Quick reply buttons appear** (1 hour, 2 hours, 3 hours, Full day) — click one
5. Select preference from emoji buttons (🏛 Culture, 🎭 Entertainment, etc.)
6. Answer food questions
7. Bot generates a personalised itinerary

---

### TEST 10 — Super Admin Portal

Go to http://localhost:4200 → sign into tenant admin → click **Super Admin** in sidebar:

1. Login form appears with email/password
2. Enter: `ukaleem540@gmail.com` / `12345678`
3. Dashboard shows: Total Tenants, MRR, Plan Breakdown, full tenant table
4. Click **Change Password** tab → change your password
5. Click **Sign out** → returns to login

---

### TEST 11 — Billing & Usage

```bash
# Check current usage
curl http://localhost:3000/api/v1/billing/usage \
  -H "Authorization: Bearer ADMIN_JWT"
# Expected: {plan, sessions:{used,limit,percentUsed,...}, messages, features}

# Change plan
curl -X PUT http://localhost:3000/api/v1/billing/plan \
  -H "Authorization: Bearer ADMIN_JWT" \
  -H "Content-Type: application/json" \
  -d '{"plan": "pro"}'
# Expected: {plan:"pro", planName:"Pro", sessionLimit:5000}
```

---

### TEST 12 — Run All Unit Tests

```bash
npx nx run-many --target=test --all
# Expected: 26 tests across 4 suites — all green

# Individual suites:
npx nx test api                    # API key guard + tenant service (10 tests)
npx nx test llm-providers          # LLM factory + UnconfiguredLlmProvider (10 tests)
npx nx test bot-core               # Flow engine state machine (6 tests)
```

---

### TEST 13 — Production Build

```bash
# Build all three apps
npm run build:api
npx nx build admin
node apps/widget/build.js --production

# Docker build (optional)
docker build -f apps/api/Dockerfile -t chatbot-api:local .
docker run -p 3000:3000 --env-file .env chatbot-api:local
```

---

## 8. Admin Dashboard Guide

**URL:** http://localhost:4200  
**Login:** Tenant slug + password (set by super admin via `POST /tenants/:id/set-password`)

| Page | What to do |
|------|-----------|
| **Dashboard** | View session stats and language breakdown |
| **Attractions** | Add/edit/delete POIs. Click **Import CSV** to bulk-load from spreadsheet |
| **Conversations** | View all chat sessions. Click row → see full message thread |
| **Bot Config** | Change bot name, greeting text, primary colour, default language |
| **LLM API Key** | Paste your OpenAI/Anthropic/Gemini/Mistral key. Field clears after save (security). Green banner confirms it's stored |
| **Embed Widget** | Copy the 2-line snippet to add the bot to any website |
| **Billing & Plan** | Usage bar + plan cards. Click a plan → "Switch to Pro" etc. |
| **Super Admin** | Own email/password login — see all tenants, MRR, change password |

---

## 9. Super Admin Portal Guide

**Location:** Admin Dashboard → Super Admin (sidebar)  
**Credentials:**
- Email: `ukaleem540@gmail.com`
- Password: `12345678`

> ⚠️ **Change the password** immediately via the Change Password tab after first login.

### Features

- **All Tenants table** — company name, slug, admin email, plan, active status, monthly sessions / limit (with progress bar), all-time sessions, MRR
- **Stats cards** — total tenants, active tenants, estimated MRR, total sessions
- **Plan breakdown** — how many tenants on each plan
- **Change Password** — enter current password + new password (strength indicator shown). Minimum 8 characters

### Creating a new tenant (Swagger or curl)

```bash
# 1. Create tenant — get apiKey + _id
curl -X POST http://localhost:3000/api/v1/tenants \
  -H "x-admin-key: YOUR_SUPER_ADMIN_KEY" \
  -d '{"name":"Company B","slug":"company-b","adminEmail":"admin@companyb.com","plan":"starter"}'

# 2. Set their admin password
curl -X POST http://localhost:3000/api/v1/tenants/TENANT_ID/set-password \
  -H "x-admin-key: YOUR_SUPER_ADMIN_KEY" \
  -d '{"password":"SecurePass123!"}'

# 3. Give them:
#   - Admin dashboard URL (http://your-domain/)
#   - Slug: company-b
#   - Password: SecurePass123!
#   - Widget snippet from Settings → Embed Widget
```

---

## 10. Widget Embed Guide

### Minimal embed (2 lines)

```html
<script src="https://YOUR_DOMAIN/widget/chatbot.js"></script>
<catania-bot tenant-id="your-slug" language="auto" api-url="https://YOUR_DOMAIN"></catania-bot>
```

### All attributes

| Attribute | Required | Description | Example |
|-----------|----------|-------------|---------|
| `tenant-id` | YES | Your company slug | `catania-city-pass` |
| `api-url` | YES | Your API server URL | `https://api.yourdomain.com` |
| `language` | no | Force lang or `auto` | `en`, `it`, `auto` |
| `primary-color` | no | Override brand color | `#e11d48` |
| `bot-name` | no | Override bot name | `My Guide` |
| `position` | no | Button position | `bottom-right` or `bottom-left` |

### Development test

Open [test.html](test.html) in Chrome — it works from `file://` (CORS is configured to allow it).

### Supported languages

English (`en`), Italian (`it`), German (`de`), French (`fr`), Spanish (`es`) — auto-detected from browser locale.

---

## 11. Billing & Plans

| Plan | Sessions/mo | Price | Languages | Branding |
|------|------------|-------|-----------|----------|
| **Starter** | 500 | $49/mo | EN + IT | Default |
| **Pro** | 5,000 | $149/mo | All 5 | Custom colors + logo |
| **Enterprise** | Unlimited | Custom | All 5 | Full custom |

### Session limit enforcement

When a tenant exceeds their monthly session limit:
- `POST /chat/session` returns **429 Too Many Requests**
- Message: `"Monthly session limit reached. Please upgrade your plan."`
- The widget shows the error message
- Upgrade via Admin Dashboard → Billing & Plan

### Stripe integration (optional)

Set these in `.env` to enable real payment processing:

```env
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_STARTER=price_xxx   # from Stripe dashboard
STRIPE_PRICE_PRO=price_yyy
```

Register webhook in Stripe dashboard: `POST https://YOUR_DOMAIN/api/v1/billing/webhook`

Without Stripe keys, plan changes update the DB only (no payment processing). Usage tracking always works regardless.

---

## 12. Deployment

See [docs/deployment-guide.md](docs/deployment-guide.md) for full options (Railway, Render, DigitalOcean, self-hosted).

### Quick start — self-hosted with Docker Compose

```bash
# Clone and configure
git clone https://github.com/ukaleem/custom-ai-chatbot .
cp .env.example .env
# Edit .env — set SUPER_ADMIN_KEY, JWT_SECRET, ALLOWED_ORIGINS

# Build widget
node apps/widget/build.js --production

# Launch everything
docker compose -f docker-compose.prod.yml up -d

# Check health
curl http://localhost:3000/api/v1/health
```

### Environment variables for production

```env
NODE_ENV=production
SUPER_ADMIN_KEY=<openssl rand -hex 32>
JWT_SECRET=<openssl rand -hex 32>
MONGODB_URI=mongodb://mongo:27017/custom-ai-chatbot
REDIS_HOST=redis
QDRANT_URL=http://qdrant:6333
ALLOWED_ORIGINS=https://your-admin-domain.com,https://your-client-website.com
```

### GitHub Actions CI/CD

The `.github/workflows/ci.yml` runs on every PR:
- ESLint across all projects
- Unit tests (26 tests)
- Production builds for API + Admin
- Docker image build

The `.github/workflows/deploy.yml` runs on push to `main`:
- Builds + pushes Docker image to Docker Hub
- Add your deployment hook at the bottom of the file

---

## 13. Troubleshooting

### "Failed to save" on Bot Config

**Cause:** The Mongoose schema defaults `logoUrl` to `''` which fails `@IsUrl()`. Fixed in the DTO with `@Transform(emptyToUndefined)`.

**Fix:** Restart the API (`npm run start:api:dev`) to pick up the latest code.

### "Invalid API key" on LLM settings

**Cause:** Session became stale (DB reset, or API key was regenerated). The Angular app's 401 interceptor now auto-logs you out when this happens.

**Fix:** Sign out and sign back in.

### Widget shows "[object Object]" quick replies

**Fixed:** The widget now correctly handles `{label, value}` quick reply objects from the API. Rebuild with `node apps/widget/build.js --production`.

### Bot returns demo responses (no real AI)

**Cause:** No LLM API key configured for the tenant.

**Fix:** Admin Dashboard → LLM API Key → paste your OpenAI/Anthropic/Gemini key → Save.

### Chat session fails with 500

**Cause:** LLM API key is invalid or quota exceeded.

**Fix:** Check the API logs (`tail -f /tmp/api.log`). Set a valid key via dashboard.

### CORS error in test.html

**Cause:** Old ALLOWED_ORIGINS config. The CORS now allows `null` origin for file:// testing.

**Fix:** Restart the API. The `null` origin (file://) is now always allowed.

### Docker containers not starting

```bash
npm run docker:down   # Stop all
npm run docker:up     # Start fresh
docker ps             # Verify health status
```

---

## Quick Reference Card

```bash
# ── Dev startup ────────────────────────────────────────────────────
npm run docker:up && npm run start:api:dev  # API on :3000
npx nx serve admin                          # Admin on :4200
node apps/widget/build.js --production      # Build widget bundle

# ── Key URLs ───────────────────────────────────────────────────────
http://localhost:3000/api/docs              # Swagger UI
http://localhost:3000/api/v1/health         # Health check
http://localhost:3000/widget/chatbot.js     # Widget bundle
http://localhost:4200                       # Admin dashboard
http://localhost:6333/dashboard             # Qdrant UI

# ── Credentials ────────────────────────────────────────────────────
# Super Admin login: ukaleem540@gmail.com / 12345678
# Tenant login:  slug from DB / password set by super admin
# Swagger auth:  x-admin-key = SUPER_ADMIN_KEY from .env
#                x-api-key   = cac_xxx returned when creating tenant

# ── Tests ─────────────────────────────────────────────────────────
npx nx run-many --target=test --all         # All 26 unit tests
npm run build:api                           # API production build
npx nx build admin                          # Admin production build

# ── First-time onboarding new client ──────────────────────────────
# 1. POST /tenants          → save apiKey + _id
# 2. POST /tenants/:id/set-password
# 3. Give client: URL + slug + password + widget snippet
```

---

*Last updated: 2026-04-27 | Branch: `claude/catania-ai-bot-MctDj`*
