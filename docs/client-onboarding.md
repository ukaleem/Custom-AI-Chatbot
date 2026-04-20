# Client Onboarding Guide

Welcome to the Custom AI Chatbot platform. This guide walks you through everything needed to get your AI tourist guide live.

---

## Step 1 — What You Need to Provide

Before setup, prepare the following:

| Item | Example | Notes |
|------|---------|-------|
| **Company name** | Catania City Pass | Shown in admin dashboard |
| **Slug** | `catania-city-pass` | Lowercase, hyphens only — becomes part of your tenant ID |
| **Admin email** | admin@cataniacitypass.com | Used for dashboard login |
| **LLM provider** | OpenAI | See options below |
| **LLM API key** | `sk-...` | From your chosen provider |
| **Attractions data** | CSV or API | See data format guide |
| **Brand assets** | Logo URL, primary color | For widget customization |

---

## Step 2 — Choose Your LLM Provider

You pay your chosen LLM provider directly. We support:

| Provider | Free Tier | Best For | Sign Up |
|----------|-----------|----------|---------|
| **OpenAI** (GPT-4o) | No | Best quality | platform.openai.com |
| **Anthropic** (Claude) | No | Best reasoning | console.anthropic.com |
| **Google Gemini** | Yes (limited) | Getting started free | ai.google.dev |
| **Mistral** | Yes (limited) | European data compliance | console.mistral.ai |

**Recommendation for getting started:** Google Gemini Flash (free tier) → upgrade to OpenAI GPT-4o when ready.

### How to Get Your API Key

**OpenAI:**
1. Go to platform.openai.com → API keys
2. Click "Create new secret key"
3. Copy the key (starts with `sk-`)

**Anthropic:**
1. Go to console.anthropic.com → API Keys
2. Click "Create Key"
3. Copy the key (starts with `sk-ant-`)

**Google Gemini:**
1. Go to ai.google.dev → Get API key
2. Create a new project or select existing
3. Copy the key

---

## Step 3 — Provide Your Attractions Data

Your AI bot will only suggest places registered in your database. Follow the [Data Format Guide](./data-format-guide.md) to send us your data.

**Fastest option:** Share a Google Sheet or CSV using our template.

---

## Step 4 — We Set Everything Up

Once you've provided the items in Step 1, we will:

1. Create your tenant account
2. Set up your isolated knowledge base
3. Configure your bot with your brand colors and greeting
4. Load your attractions data
5. Give you your admin dashboard login
6. Give you the embed code for your website/app

---

## Step 5 — Embed on Your Website

Add 2 lines to your website's HTML:

```html
<script src="https://YOUR_DOMAIN/widget/chatbot.js"></script>
<catania-bot tenant-id="YOUR_TENANT_SLUG" language="auto"></catania-bot>
```

**For Ionic/Angular apps**, install our package:

```bash
npm install @custom-ai-chatbot/widget
```

```typescript
// In your app.module.ts
import { ChatbotWidgetModule } from '@custom-ai-chatbot/widget';

@NgModule({
  imports: [ChatbotWidgetModule.forRoot({ tenantId: 'YOUR_TENANT_SLUG' })]
})
```

---

## Step 6 — Admin Dashboard

Your dashboard is at: `https://YOUR_DOMAIN/admin`

From your dashboard you can:

- **Attractions** — Add, edit, delete places. Upload CSV bulk import.
- **Conversations** — See all chat sessions. Filter by date, language, flow state.
- **Analytics** — Sessions per day, top attractions asked about, language breakdown.
- **Bot Settings** — Change bot name, greeting message, colors, supported languages.
- **LLM Settings** — Update your API key or switch providers.
- **Billing** — View your plan, monthly usage, upgrade or downgrade.

---

## Support

Contact your account manager for any setup questions.
