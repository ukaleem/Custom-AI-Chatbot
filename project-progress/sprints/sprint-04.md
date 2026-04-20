# Sprint 4 — Chat API & Session Management ✅ COMPLETE

**Duration:** Week 7–8  
**Depends on:** Sprint 3 ✅  
**Branch:** `claude/catania-ai-bot-MctDj`

---

## Goal

The chat API is stable, sessionised, and ready for widget integration. Both REST and WebSocket are available. Full conversation history is persisted in MongoDB.

**Deliverable:** Full REST + WebSocket chat API. A tourist can start a session, chat through all flow states, receive a plan, and the full conversation is saved.

---

## Tasks

### Database Schemas

| # | Task | File | Status |
|---|------|------|--------|
| 1 | Conversation MongoDB schema (TTL 24h, messages sub-doc) | `apps/api/src/modules/chat/schemas/conversation.schema.ts` | ✅ |
| 2 | Register schema in chat module | `apps/api/src/modules/chat/chat.module.ts` | ✅ |

### Chat Services

| # | Task | File | Status |
|---|------|------|--------|
| 3 | Session service (create, load, save context, end) | `apps/api/src/modules/chat/session.service.ts` | ✅ |
| 4 | Chat service (orchestrates FlowEngine + RAG + LLM) | `apps/api/src/modules/chat/chat.service.ts` | ✅ |

### REST Endpoints

| # | Task | File | Status |
|---|------|------|--------|
| 5 | Chat REST controller | `apps/api/src/modules/chat/chat.controller.ts` | ✅ |
| 6 | `POST /chat/session` — create new session + greeting | `chat.controller.ts` | ✅ |
| 7 | `POST /chat/message` — send message, get reply | `chat.controller.ts` | ✅ |
| 8 | `GET /chat/session/:id/history` — retrieve full conversation | `chat.controller.ts` | ✅ |
| 9 | `PATCH /chat/session/:id/end` — close session | `chat.controller.ts` | ✅ |

### WebSocket

| # | Task | File | Status |
|---|------|------|--------|
| 10 | WebSocket gateway (socket.io, namespace `/chat`) | `apps/api/src/modules/chat/chat.gateway.ts` | ✅ |
| 11 | Install `@nestjs/websockets` + `@nestjs/platform-socket.io` + `socket.io` | `package.json` | ✅ |
| 12 | `chat:start` event — creates session, sends greeting | `chat.gateway.ts` | ✅ |
| 13 | `chat:message` event — sends message, returns reply | `chat.gateway.ts` | ✅ |
| 14 | `chat:end` event — ends session | `chat.gateway.ts` | ✅ |
| 15 | Auth on WS connection via `x-api-key` header | `chat.gateway.ts` | ✅ |

### Session Management

| # | Task | File | Status |
|---|------|------|--------|
| 16 | Session timeout (24h TTL index on MongoDB) | `conversation.schema.ts` | ✅ |
| 17 | Session context rebuild from DB history | `session.service.ts#buildFlowContext` | ✅ |
| 18 | Usage counter increment per session | `chat.service.ts#startSession` | ✅ |

### Security & Limits

| # | Task | File | Status |
|---|------|------|--------|
| 19 | Rate limiting (60 req/min global via `@nestjs/throttler`) | `apps/api/src/app.module.ts` | ✅ |
| 20 | Plan limit enforcement (block at monthly session limit) | `chat.service.ts#startSession` | ✅ |
| 21 | Tenant isolation (session `tenantId` validated on every op) | `session.service.ts#findBySessionId` | ✅ |

### Module Wiring

| # | Task | File | Status |
|---|------|------|--------|
| 22 | Chat module | `apps/api/src/modules/chat/chat.module.ts` | ✅ |
| 23 | Register ChatModule + ThrottlerModule in AppModule | `apps/api/src/app.module.ts` | ✅ |

---

## Endpoints Created

```
# All require x-api-key header

POST   /api/v1/chat/session
  Body: { language?: "en" | "it" | "de" | "fr" | "es" }
  Response: { sessionId, message, quickReplies, flowState, language, isComplete }

POST   /api/v1/chat/message
  Body: { sessionId: string, message: string }
  Response: { sessionId, message, quickReplies, flowState, language, isComplete }

GET    /api/v1/chat/session/:id/history
  Response: { sessionId, currentState, language, collectedParams, messages, isActive }

PATCH  /api/v1/chat/session/:id/end
  Response: 204 No Content

# WebSocket (socket.io namespace: /chat)
# Auth: x-api-key in handshake headers or handshake.auth.apiKey

emit: "chat:start"    { language?: string }
on:   "chat:response" { sessionId, message, quickReplies, flowState, language, isComplete }

emit: "chat:message"  { sessionId: string, message: string }
on:   "chat:response" { ... }

emit: "chat:end"      { sessionId: string }
on:   "chat:ended"    { sessionId }

on:   "chat:error"    { message: string }
```

---

## Definition of Done ✅

- [x] Full conversation flow works via REST: greeting → questions → plan
- [x] Full conversation flow works via WebSocket (socket.io)
- [x] Session history persists in MongoDB with TTL auto-expiry
- [x] Two sessions from different tenants cannot access each other
- [x] Plan limit blocks new sessions when tenant exceeds monthly quota
- [x] Rate limiting: 60 requests/minute globally
- [x] TypeScript compiles with no errors
