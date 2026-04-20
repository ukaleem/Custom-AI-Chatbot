import { Module } from '@nestjs/common';
import { QdrantService } from './qdrant.service';
import { EmbeddingService } from './embedding.service';
import { RetrievalService } from './retrieval.service';

@Module({
  providers: [QdrantService, EmbeddingService, RetrievalService],
  exports: [QdrantService, EmbeddingService, RetrievalService],
})
export class RagModule {}
