┌─────────────────────────────────────────────────────┐
│              CATANIA AI BOT - SaaS Architecture      │
├─────────────────────────────────────────────────────┤
│  LAYER 1: LLM Abstraction                            │
│  ├─ Free:  Google Gemini Flash / Mistral (free tier) │
│  └─ Paid:  OpenAI GPT-4o / Anthropic Claude          │
│  → Switch via LLM_PROVIDER env var, zero code change │
│                                                       │
│  LAYER 2: RAG Pipeline (LangChain.js or LlamaIndex)  │
│  ├─ Tourist data → vector embeddings                 │
│  ├─ Query → retrieve only REGISTERED spots           │
│  └─ Context-aware response generation                │
│                                                       │
│  LAYER 3: Guided Flow Engine                         │
│  ├─ State machine: hours → preference → food →       │
│  │  sitting/walking                                  │
│  └─ Only then → RAG query with collected params      │
│                                                       │
│  LAYER 4: Multi-Tenant SaaS                          │
│  ├─ Each company = separate knowledge base           │
│  ├─ Isolated vector DB namespace per tenant          │
│  └─ Stripe billing per tenant                        │
│                                                       │
│  LAYER 5: Integration Layer (REST + WebSocket)       │
│  ├─ Embeddable JS widget (website)                   │
│  ├─ React Native / Flutter SDK wrapper               │
│  └─ REST API for custom integrations                 │
└─────────────────────────────────────────────────────┘
