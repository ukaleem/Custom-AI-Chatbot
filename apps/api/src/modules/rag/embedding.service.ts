import { Injectable, Logger } from '@nestjs/common';
import { OpenAIEmbeddings } from '@langchain/openai';
import { IAttraction } from '@custom-ai-chatbot/shared-types';

@Injectable()
export class EmbeddingService {
  private readonly logger = new Logger(EmbeddingService.name);

  private getEmbeddings(apiKey: string): OpenAIEmbeddings {
    return new OpenAIEmbeddings({
      openAIApiKey: apiKey,
      modelName: 'text-embedding-3-small',
    });
  }

  buildAttractionText(attraction: Partial<IAttraction>): string {
    return [
      attraction.name?.en,
      attraction.shortDescription?.en,
      attraction.description?.en,
      attraction.category,
      attraction.tags?.join(', '),
    ]
      .filter(Boolean)
      .join('. ');
  }

  async embedAttraction(attraction: Partial<IAttraction>, openAiKey: string): Promise<number[]> {
    const text = this.buildAttractionText(attraction);
    this.logger.debug(`Embedding text (${text.length} chars)`);
    const embeddings = this.getEmbeddings(openAiKey);
    const [vector] = await embeddings.embedDocuments([text]);
    return vector;
  }

  async embedQuery(query: string, openAiKey: string): Promise<number[]> {
    const embeddings = this.getEmbeddings(openAiKey);
    return embeddings.embedQuery(query);
  }
}
