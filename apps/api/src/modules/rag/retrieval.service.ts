import { Injectable } from '@nestjs/common';
import { AttractionCategory, FoodStyle, ILLMProvider, PriceRange } from '@custom-ai-chatbot/shared-types';
import { EmbeddingService } from './embedding.service';
import { QdrantService } from './qdrant.service';

export interface RetrievalQuery {
  tenantId: string;
  naturalLanguageQuery: string;
  llmProvider?: ILLMProvider;
  openAiKey?: string;
  filters?: {
    categories?: AttractionCategory[];
    maxDurationMinutes?: number;
    priceRange?: PriceRange[];
    foodStyle?: FoodStyle;
  };
  limit?: number;
}

@Injectable()
export class RetrievalService {
  constructor(
    private readonly embedding: EmbeddingService,
    private readonly qdrant: QdrantService,
  ) {}

  async search(query: RetrievalQuery) {
    const vector = query.llmProvider
      ? await query.llmProvider.embed(query.naturalLanguageQuery)
      : await this.embedding.embedQuery(query.naturalLanguageQuery, query.openAiKey!);

    const qdrantFilter = this.buildFilter(query.filters);

    const results = await this.qdrant.search(query.tenantId, vector, qdrantFilter, query.limit ?? 5);

    return results.map((r) => r.payload);
  }

  private buildFilter(filters?: RetrievalQuery['filters']): Record<string, unknown> {
    if (!filters) return {};

    const must: unknown[] = [];

    if (filters.categories?.length) {
      must.push({ key: 'category', match: { any: filters.categories } });
    }

    if (filters.maxDurationMinutes !== undefined) {
      must.push({
        key: 'durationMinutes',
        range: { lte: filters.maxDurationMinutes },
      });
    }

    if (filters.priceRange?.length) {
      must.push({ key: 'priceRange', match: { any: filters.priceRange } });
    }

    if (filters.foodStyle) {
      must.push({ key: 'foodStyle', match: { value: filters.foodStyle } });
    }

    return must.length ? { must } : {};
  }
}
