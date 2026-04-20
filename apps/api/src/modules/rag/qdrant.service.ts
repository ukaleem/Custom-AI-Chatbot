import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { QdrantClient } from '@qdrant/js-client-rest';

const VECTOR_SIZE = 1536; // text-embedding-3-small

@Injectable()
export class QdrantService implements OnModuleInit {
  private readonly logger = new Logger(QdrantService.name);
  private client: QdrantClient;

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    const url = this.config.get<string>('qdrant.url');
    this.client = new QdrantClient({ url });
    this.logger.log(`Qdrant client initialised → ${url}`);
  }

  collectionName(tenantId: string): string {
    return `attractions_${tenantId}`;
  }

  async ensureCollection(tenantId: string): Promise<void> {
    const name = this.collectionName(tenantId);
    const { collections } = await this.client.getCollections();
    const exists = collections.some((c) => c.name === name);

    if (!exists) {
      await this.client.createCollection(name, {
        vectors: { size: VECTOR_SIZE, distance: 'Cosine' },
      });
      this.logger.log(`Created Qdrant collection: ${name}`);
    }
  }

  async upsert(tenantId: string, id: string, vector: number[], payload: Record<string, unknown>): Promise<void> {
    await this.ensureCollection(tenantId);
    await this.client.upsert(this.collectionName(tenantId), {
      wait: true,
      points: [{ id, vector, payload }],
    });
  }

  async delete(tenantId: string, id: string): Promise<void> {
    const name = this.collectionName(tenantId);
    await this.client.delete(name, { wait: true, points: [id] });
  }

  async search(
    tenantId: string,
    vector: number[],
    filter: Record<string, unknown> = {},
    limit = 5,
  ) {
    await this.ensureCollection(tenantId);
    return this.client.search(this.collectionName(tenantId), {
      vector,
      limit,
      filter: Object.keys(filter).length ? filter : undefined,
      with_payload: true,
    });
  }
}
