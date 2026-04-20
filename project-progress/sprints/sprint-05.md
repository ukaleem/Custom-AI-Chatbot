# Sprint 5 — Admin Dashboard ⬜ PLANNED

**Duration:** Week 9–10  
**Depends on:** Sprint 4 ✅ (Chat API stable)  
**Branch:** `claude/catania-ai-bot-MctDj`

---

## Goal

Company A can log into their own dashboard, manage their attraction data, view all conversations, configure their bot, and get the embed code for their website.

**Deliverable:** Company A logs into `https://your-domain/admin`, adds attractions via form or CSV, views chat analytics, customises bot name/colors, and copies the widget embed snippet.

---

## Tasks

### API — Admin Auth Endpoints

| # | Task | File | Status |
|---|------|------|--------|
| 1 | Install JWT packages | `package.json` (`@nestjs/jwt`, `@nestjs/passport`, `passport-jwt`) | ⬜ |
| 2 | Admin auth module | `apps/api/src/modules/admin-auth/admin-auth.module.ts` | ⬜ |
| 3 | Admin login endpoint | `POST /api/v1/admin/login` → returns JWT | ⬜ |
| 4 | JWT strategy | `apps/api/src/modules/admin-auth/jwt.strategy.ts` | ⬜ |
| 5 | JWT auth guard | `apps/api/src/modules/admin-auth/jwt-auth.guard.ts` | ⬜ |
| 6 | Admin password on Tenant schema | Add `adminPasswordHash` field to `tenant.schema.ts` | ⬜ |
| 7 | Set admin password endpoint | `POST /api/v1/tenants/:id/set-password` (super-admin only) | ⬜ |

### API — Analytics Endpoints

| # | Task | File | Status |
|---|------|------|--------|
| 8 | Analytics service | `apps/api/src/modules/analytics/analytics.service.ts` | ⬜ |
| 9 | Analytics controller | `apps/api/src/modules/analytics/analytics.controller.ts` | ⬜ |
| 10 | `GET /analytics/overview` — sessions today, total, top attractions | ⬜ |
| 11 | `GET /analytics/conversations` — paginated conversation list | ⬜ |
| 12 | `GET /analytics/languages` — language breakdown | ⬜ |
| 13 | Analytics module | `apps/api/src/modules/analytics/analytics.module.ts` | ⬜ |

### Angular Admin App — Scaffold

| # | Task | File | Status |
|---|------|------|--------|
| 14 | Admin Angular app scaffold | `apps/admin/` (project.json, tsconfig, main.ts, app.module.ts) | ⬜ |
| 15 | Angular routing module | `apps/admin/src/app/app-routing.module.ts` | ⬜ |
| 16 | Environment config | `apps/admin/src/environments/environment.ts` | ⬜ |
| 17 | API service (HttpClient base) | `apps/admin/src/app/services/api.service.ts` | ⬜ |

### Angular Admin App — Auth

| # | Task | File | Status |
|---|------|------|--------|
| 18 | Auth service (login, JWT storage) | `apps/admin/src/app/services/auth.service.ts` | ⬜ |
| 19 | Auth guard (`CanActivate`) | `apps/admin/src/app/guards/auth.guard.ts` | ⬜ |
| 20 | Login page component | `apps/admin/src/app/pages/login/` | ⬜ |
| 21 | JWT interceptor (add Bearer token) | `apps/admin/src/app/interceptors/jwt.interceptor.ts` | ⬜ |

### Angular Admin App — Layout

| # | Task | File | Status |
|---|------|------|--------|
| 22 | Main layout component (sidebar + topbar) | `apps/admin/src/app/components/layout/` | ⬜ |
| 23 | Sidebar navigation | `apps/admin/src/app/components/sidebar/` | ⬜ |

### Angular Admin App — Pages

| # | Task | File | Status |
|---|------|------|--------|
| 24 | Dashboard overview page | `apps/admin/src/app/pages/dashboard/` | ⬜ |
| 25 | Attractions list page (with search + filter) | `apps/admin/src/app/pages/attractions/list/` | ⬜ |
| 26 | Add/edit attraction form | `apps/admin/src/app/pages/attractions/form/` | ⬜ |
| 27 | Bulk CSV import UI | `apps/admin/src/app/pages/attractions/import/` | ⬜ |
| 28 | Conversations viewer (paginated table) | `apps/admin/src/app/pages/conversations/` | ⬜ |
| 29 | Conversation detail (full message thread) | `apps/admin/src/app/pages/conversations/detail/` | ⬜ |
| 30 | Bot settings page (name, greeting, colors) | `apps/admin/src/app/pages/settings/bot/` | ⬜ |
| 31 | LLM settings page (provider selector, API key) | `apps/admin/src/app/pages/settings/llm/` | ⬜ |
| 32 | Widget snippet generator page | `apps/admin/src/app/pages/settings/widget/` | ⬜ |

### Responsive Design

| # | Task | File | Status |
|---|------|------|--------|
| 33 | Mobile-responsive layout (all pages) | All admin components | ⬜ |
| 34 | Shared UI components (button, table, card, badge) | `apps/admin/src/app/components/ui/` | ⬜ |

---

## Key Implementation Notes

### Widget Snippet Generator
The widget page should display this for the tenant to copy:
```html
<script src="https://YOUR_DOMAIN/widget/chatbot.js"></script>
<catania-bot tenant-id="TENANT_SLUG" language="auto"></catania-bot>
```

### LLM Settings Security
When a tenant saves their LLM API key, the frontend should:
1. Send it to `PUT /tenants/:id/llm-config`
2. Never display the key again (show masked: `sk-...***`)
3. Only allow "Replace key" action

### Admin Login Flow
```
POST /api/v1/admin/login
Body: { slug: "catania-city-pass", password: "..." }
Response: { accessToken: "eyJ...", expiresIn: 86400 }
```
JWT payload: `{ tenantId, slug, role: "admin" }`

---

## Definition of Done

- [ ] Admin can log in and access their own data only
- [ ] Attractions CRUD works via dashboard
- [ ] CSV import loads 10+ attractions correctly
- [ ] Conversations page shows real chat sessions
- [ ] Bot settings changes persist and affect live bot
- [ ] Widget snippet matches the tenant's slug
- [ ] Dashboard looks good on mobile (375px width)
- [ ] TypeScript compiles with no errors
