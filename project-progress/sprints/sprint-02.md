# Sprint 2 — Data Layer & RAG Pipeline 🚀 READY TO START

**Duration:** Week 3–4  
**Depends on:** Sprint 1 ✅  
**Branch:** `claude/catania-ai-bot-MctDj`

---

## Goal

Companies can feed attraction data via REST API. The RAG pipeline embeds that data into Qdrant and retrieves only relevant, tenant-specific results when queried.

**Deliverable:** Company A pushes Catania attractions via API. A similarity search with `{ preference: "culture", availableHours: 3, tenantId: "..." }` returns only their registered spots.

---

## Prerequisites

- Sprint 1 complete ✅
- Docker running: `npm run docker:up`
- `.env` has `QDRANT_URL=http://localhost:6333`
- At least one tenant created (from Sprint 1)

---

## Tasks

### Attractions Module

| # | Task | File | Status |
|---|------|------|--------|
| 1 | Attraction MongoDB schema | `apps/api/src/modules/attractions/schemas/attraction.schema.ts` | ⬜ |
| 2 | Create attraction DTO | `apps/api/src/modules/attractions/dto/create-attraction.dto.ts` | ⬜ |
| 3 | Update attraction DTO | `apps/api/src/modules/attractions/dto/update-attraction.dto.ts` | ⬜ |
| 4 | Bulk import DTO | `apps/api/src/modules/attractions/dto/bulk-import.dto.ts` | ⬜ |
| 5 | Attraction CRUD service | `apps/api/src/modules/attractions/attraction.service.ts` | ⬜ |
| 6 | Attraction REST controller | `apps/api/src/modules/attractions/attraction.controller.ts` | ⬜ |
| 7 | Attraction module | `apps/api/src/modules/attractions/attraction.module.ts` | ⬜ |

### RAG Module

| # | Task | File | Status |
|---|------|------|--------|
| 8 | Qdrant service | `apps/api/src/modules/rag/qdrant.service.ts` | ⬜ |
| 9 | Embedding service | `apps/api/src/modules/rag/embedding.service.ts` | ⬜ |
| 10 | Retrieval service | `apps/api/src/modules/rag/retrieval.service.ts` | ⬜ |
| 11 | RAG module | `apps/api/src/modules/rag/rag.module.ts` | ⬜ |

### Integration

| # | Task | File | Status |
|---|------|------|--------|
| 12 | Auto-embed on attraction save/update | Hook in `attraction.service.ts` | ⬜ |
| 13 | Auto-delete vector on attraction delete | Hook in `attraction.service.ts` | ⬜ |
| 14 | Register modules in AppModule | `apps/api/src/app.module.ts` | ⬜ |
| 15 | Install LangChain + Qdrant client | `package.json` | ⬜ |
| 16 | Update `.env.example` if new vars needed | `.env.example` | ⬜ |

---

## Endpoints to Create

```
# All below use x-api-key header (tenant-scoped)

POST   /api/v1/attractions              → Create single attraction
GET    /api/v1/attractions              → List all attractions for tenant
GET    /api/v1/attractions/:id          → Get single attraction
PUT    /api/v1/attractions/:id          → Update attraction
DELETE /api/v1/attractions/:id          → Delete attraction (+ remove from Qdrant)
POST   /api/v1/attractions/bulk         → Bulk create up to 100 attractions
POST   /api/v1/attractions/reindex      → Re-embed all attractions into Qdrant

# Internal (used by chat module in Sprint 4, not public)
# retrieval.service.ts → search(tenantId, query, filters) → IAttraction[]
```

---

## Key Implementation Notes

### Qdrant Collection Naming
Each tenant gets their own Qdrant collection: `attractions_{tenantId}`

```typescript
// Example in qdrant.service.ts
const collectionName = `attractions_${tenantId}`;
```

This provides hard data isolation — one tenant can never query another's vectors.

### Attraction Text for Embedding
Combine fields for a richer vector:
```typescript
const textForEmbedding = [
  attraction.name.en,
  attraction.description.en,
  attraction.category,
  attraction.tags.join(', '),
  attraction.shortDescription.en,
].join('. ');
```

### Retrieval Filter Params
The retrieval service should accept:
```typescript
interface RetrievalQuery {
  tenantId: string;
  naturalLanguageQuery: string;     // e.g. "culture sites for 3 hours"
  filters: {
    categories?: AttractionCategory[];
    maxDurationMinutes?: number;
    priceRange?: PriceRange[];
    foodStyle?: FoodStyle;
  };
  limit?: number;                   // default: 5
}
```

### Embedding Provider
For Sprint 2, use OpenAI `text-embedding-3-small` as the default embedding model (free to switch later). Store the embedding model choice in tenant config.

---

## New Dependencies to Install

```bash
npm install @langchain/community @langchain/openai @qdrant/js-client-rest langchain
```

---

## Definition of Done

- [ ] `POST /api/v1/attractions` with valid `x-api-key` creates an attraction AND stores its vector in Qdrant
- [ ] `POST /api/v1/attractions/bulk` with 5 test attractions all appear in Qdrant
- [ ] `retrieval.service.ts` `search()` method returns only attractions from the correct tenant
- [ ] Deleting an attraction removes it from both MongoDB and Qdrant
- [ ] TypeScript compiles with no errors
