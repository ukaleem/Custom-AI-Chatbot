# Sprint 6 — Embeddable Widget ⬜ PLANNED

**Duration:** Week 11–12  
**Depends on:** Sprint 4 ✅ (Chat API stable)  
**Branch:** `claude/catania-ai-bot-MctDj`

---

## Goal

The chatbot can be embedded on any website or Ionic/Angular app with 2 lines of code. The widget is fully branded per tenant (colors, logo, bot name) and works in multiple languages.

**Deliverable:** Paste 2 lines on a plain HTML page → working tourist guide bot. Same widget works in Ionic app via npm package.

---

## Tasks

### Angular Widget App — Scaffold

| # | Task | File | Status |
|---|------|------|--------|
| 1 | Widget Angular app scaffold | `apps/widget/project.json`, `tsconfig*.json` | ⬜ |
| 2 | Custom elements configuration | `apps/widget/src/main.ts` (Angular Elements setup) | ⬜ |
| 3 | Widget webpack config (single JS bundle) | `apps/widget/webpack.config.js` | ⬜ |
| 4 | Widget config interface | `apps/widget/src/config/widget.config.ts` | ⬜ |

### Components

| # | Task | File | Status |
|---|------|------|--------|
| 5 | Chat launcher (floating button) | `apps/widget/src/components/chat-launcher/` | ⬜ |
| 6 | Chat window (main panel, open/close) | `apps/widget/src/components/chat-window/` | ⬜ |
| 7 | Message bubble (user + bot styles) | `apps/widget/src/components/message-bubble/` | ⬜ |
| 8 | Quick replies (option button row) | `apps/widget/src/components/quick-replies/` | ⬜ |
| 9 | Typing indicator (3-dot animation) | `apps/widget/src/components/typing-indicator/` | ⬜ |
| 10 | Bot avatar (optional logo/icon) | `apps/widget/src/components/bot-avatar/` | ⬜ |

### Services

| # | Task | File | Status |
|---|------|------|--------|
| 11 | Chat service (REST + WebSocket fallback) | `apps/widget/src/services/chat.service.ts` | ⬜ |
| 12 | Theme service (apply tenant colors via CSS vars) | `apps/widget/src/services/theme.service.ts` | ⬜ |
| 13 | i18n service (en, it, de, fr, es) | `apps/widget/src/services/i18n.service.ts` | ⬜ |
| 14 | Config service (parse HTML attributes) | `apps/widget/src/services/config.service.ts` | ⬜ |

### Web Component Wrapper

| # | Task | File | Status |
|---|------|------|--------|
| 15 | Angular Elements wrapper | `apps/widget/src/widget.element.ts` | ⬜ |
| 16 | Register `<catania-bot>` custom element | `apps/widget/src/main.ts` | ⬜ |
| 17 | Shadow DOM encapsulation (styles don't bleed) | Component `encapsulation: ViewEncapsulation.ShadowDom` | ⬜ |

### Bundle & Distribution

| # | Task | File | Status |
|---|------|------|--------|
| 18 | Single-file bundle (`chatbot.js`) | Webpack build output | ⬜ |
| 19 | Serve widget bundle via API (static files) | `apps/api/src/modules/widget/` or Express static | ⬜ |
| 20 | npm package setup | `apps/widget/package.json` (publishable) | ⬜ |

### Integration Guides

| # | Task | File | Status |
|---|------|------|--------|
| 21 | Plain HTML embed guide | `docs/widget-html-embed.md` | ⬜ |
| 22 | Ionic/Angular integration guide | `docs/ionic-integration.md` | ⬜ |

---

## Widget HTML Usage (target API)

```html
<!-- Plain website embed — 2 lines -->
<script src="https://your-domain.com/widget/chatbot.js"></script>
<catania-bot
  tenant-id="catania-city-pass"
  language="auto"
  primary-color="#FF6B35"
  bot-name="Catania Guide">
</catania-bot>
```

## Ionic/Angular Usage

```typescript
// Install
npm install @custom-ai-chatbot/widget

// app.module.ts
import { ChatbotWidgetModule } from '@custom-ai-chatbot/widget';

@NgModule({
  imports: [
    ChatbotWidgetModule.forRoot({
      tenantId: 'catania-city-pass',
      apiUrl: 'https://your-domain.com',
    })
  ]
})

// In any template
<chatbot-widget [config]="{ language: 'auto' }"></chatbot-widget>
```

---

## Widget Config Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `tenant-id` | string | required | Tenant slug |
| `language` | string | `"auto"` | Force language or auto-detect |
| `primary-color` | string | `"#2563EB"` | Main theme color |
| `bot-name` | string | `"Guide"` | Bot display name |
| `position` | string | `"bottom-right"` | Launcher position |
| `api-url` | string | auto | Override API URL |

---

## i18n Strings to Translate

```typescript
const UI_STRINGS = {
  en: { placeholder: "Type a message...", openChat: "Chat with Guide", closeChat: "Close" },
  it: { placeholder: "Scrivi un messaggio...", openChat: "Chatta con la Guida", closeChat: "Chiudi" },
  de: { placeholder: "Nachricht eingeben...", openChat: "Mit Guide chatten", closeChat: "Schließen" },
  fr: { placeholder: "Tapez un message...", openChat: "Discuter avec le Guide", closeChat: "Fermer" },
  es: { placeholder: "Escribe un mensaje...", openChat: "Chatear con la Guía", closeChat: "Cerrar" },
}
```

---

## Definition of Done

- [ ] `<script src="/widget/chatbot.js"></script>` loads on plain HTML page
- [ ] Bot opens, runs through all 5 flow states, delivers a plan
- [ ] Changing `primary-color` attribute changes all button/header colors
- [ ] `language="it"` forces Italian UI text
- [ ] `language="auto"` detects browser language
- [ ] Widget styles don't leak into host page (Shadow DOM)
- [ ] Works in Ionic 7 + Angular 17 app
- [ ] TypeScript compiles with no errors
