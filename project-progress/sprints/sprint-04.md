# Sprint 4 — Chat API & Session Management ⬜ PLANNED

**Duration:** Week 7–8  
**Depends on:** Sprint 3 ✅ (Flow engine working)  
**Branch:** `claude/catania-ai-bot-MctDj`

---

## Goal

The chat API is stable, sessionised, and ready for widget integration. Both REST and WebSocket are available. Full conversation history is persisted in MongoDB.

**Deliverable:** Full REST + WebSocket chat API. A tourist can start a session, chat through all 5 flow states, receive a plan, and the full conversation is saved. Postman collection delivered.

---

## Tasks

### Database Schemas

| # | Task | File | Status |
|---|------|------|--------|
| 1 | Conversation MongoDB schema | `apps/api/src/modules/chat/schemas/conversation.schema.ts` | ⬜ |
| 2 | Register schema in chat module | `apps/api/src/modules/chat/chat.module.ts` | ⬜ |

### Chat Services

| # | Task | File | Status |
|---|------|------|--------|
| 3 | Session service (create, get, close sessions) | `apps/api/src/modules/chat/session.service.ts` | ⬜ |
| 4 | Bot service (orchestrate flow engine + RAG + LLM) | `apps/api/src/modules/chat/bot.service.ts` | ⬜ |
| 5 | Chat service (entry point, calls bot + session) | `apps/api/src/modules/chat/chat.service.ts` | ⬜ |

### REST Endpoints

| # | Task | File | Status |
|---|------|------|--------|
| 6 | Chat REST controller | `apps/api/src/modules/chat/chat.controller.ts` | ⬜ |
| 7 | `POST /chat/session` — create new session | `chat.controller.ts` | ⬜ |
| 8 | `POST /chat/message` — send message, get reply | `chat.controller.ts` | ⬜ |
| 9 | `GET /chat/session/:id/history` — retrieve full conversation | `chat.controller.ts` | ⬜ |
| 10 | `PATCH /chat/session/:id/end` — close session | `chat.controller.ts` | ⬜ |

### WebSocket

| # | Task | File | Status |
|---|------|------|--------|
| 11 | WebSocket gateway | `apps/api/src/modules/chat/chat.gateway.ts` | ⬜ |
| 12 | Install `@nestjs/websockets` + `socket.io` | `package.json` | ⬜ |
| 13 | `chat` event handler (message in, reply out) | `chat.gateway.ts` | ⬜ |
| 14 | Typing indicator event (`bot:typing`) | `chat.gateway.ts` | ⬜ |
| 15 | Session join/leave room events | `chat.gateway.ts` | ⬜ |

### Session Management

| # | Task | File | Status |
|---|------|------|--------|
| 16 | Session timeout (24h TTL index on MongoDB) | `conversation.schema.ts` | ⬜ |
| 17 | Session continuation (resume from history) | `session.service.ts` | ⬜ |
| 18 | Usage counter increment per session/message | Call `tenantsService.incrementSessionCount()` | ⬜ |

### Security & Limits

| # | Task | File | Status |
|---|------|------|--------|
| 19 | Rate limiting (`@nestjs/throttler`) | `apps/api/src/app.module.ts` | ⬜ |
| 20 | Plan limit enforcement (block at monthly limit) | Guard or middleware in chat module | ⬜ |
| 21 | Tenant isolation enforcement (session belongs to tenant) | Guard validation in `session.service.ts` | ⬜ |

### Module Wiring

| # | Task | File | Status |
|---|------|------|--------|
| 22 | Chat module | `apps/api/src/modules/chat/chat.module.ts` | ⬜ |
| 23 | Register chat module in AppModule | `apps/api/src/app.module.ts` | ⬜ |

### Documentation

| # | Task | File | Status |
|---|------|------|--------|
| 24 | Postman collection | `docs/postman-collection.json` | ⬜ |

---

## Endpoints to Create

```
# All require x-api-key header

POST   /api/v1/chat/session
  Body: { language?: "en" | "it" | "de" | "fr" | "es" }
  Response: { sessionId: string, greeting: string, quickReplies: [] }

POST   /api/v1/chat/message
  Body: { sessionId: string, message: string }
  Response: { sessionId, message, quickReplies, flowState, language, isComplete }

GET    /api/v1/chat/session/:id/history
  Response: { sessionId, messages: [...], flowState, collectedParams }

PATCH  /api/v1/chat/session/:id/end
  Response: 200 OK

# WebSocket events (socket.io namespace: /chat)
emit: "chat:message"   { sessionId, message }
on:   "chat:reply"     { message, quickReplies, flowState, isComplete }
on:   "bot:typing"     { sessionId }
```

---

## Conversation Schema Fields

```typescript
{
  tenantId: ObjectId,           // ref: Tenant — for isolation
  sessionId: string,            // UUID — used by widget
  language: string,             // detected user language
  messages: [{
    role: 'user' | 'assistant',
    content: string,
    timestamp: Date,
  }],
  flowState: BotFlowState,      // current state machine position
  collectedParams: {
    availableHours?: number,
    preference?: string,
    wantsFood?: boolean,
    foodStyle?: string,
  },
  isActive: boolean,
  startedAt: Date,
  lastMessageAt: Date,
  endedAt?: Date,                // set when session ends
}
// TTL index: auto-delete after 30 days
```

---

## Definition of Done

- [ ] Full conversation flow works via REST: greeting → questions → plan
- [ ] Full conversation flow works via WebSocket
- [ ] Session history persists in MongoDB
- [ ] Two sessions from different tenants cannot access each other
- [ ] Plan limit blocks sessions when tenant exceeds monthly quota (returns 429)
- [ ] Postman collection works against running local API
- [ ] TypeScript compiles with no errors
