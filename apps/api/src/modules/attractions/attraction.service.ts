import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Attraction, AttractionDocument } from './schemas/attraction.schema';
import { CreateAttractionDto } from './dto/create-attraction.dto';
import { UpdateAttractionDto } from './dto/update-attraction.dto';
import { QdrantService } from '../rag/qdrant.service';
import { EmbeddingService } from '../rag/embedding.service';
import { TenantDocument } from '../tenants/schemas/tenant.schema';

@Injectable()
export class AttractionService {
  private readonly logger = new Logger(AttractionService.name);

  constructor(
    @InjectModel(Attraction.name) private readonly model: Model<AttractionDocument>,
    private readonly qdrant: QdrantService,
    private readonly embedding: EmbeddingService,
  ) {}

  // ── Helpers ────────────────────────────────────────────────────────────────

  private getOpenAiKey(tenant: TenantDocument): string {
    const key = (tenant as any).llmConfig?.apiKey as string | undefined;
    if (!key) {
      throw new BadRequestException(
        'No OpenAI API key configured for this tenant. Set it via PUT /tenants/:id.',
      );
    }
    return key;
  }

  private async embedAndUpsert(doc: AttractionDocument, tenant: TenantDocument): Promise<void> {
    try {
      const openAiKey = this.getOpenAiKey(tenant);
      const vector = await this.embedding.embedAttraction(doc.toObject(), openAiKey);
      await this.qdrant.upsert(tenant.id, doc.id, vector, {
        mongoId: doc.id,
        tenantId: tenant.id,
        name: doc.name.en,
        category: doc.category,
        tags: doc.tags,
        priceRange: doc.priceRange ?? null,
        foodStyle: doc.foodStyle ?? null,
        durationMinutes: doc.durationMinutes ?? null,
        address: doc.address,
        isActive: doc.isActive,
      });
    } catch (err) {
      this.logger.warn(`Vector embed skipped for ${doc.id}: ${(err as Error).message}`);
    }
  }

  // ── CRUD ───────────────────────────────────────────────────────────────────

  async create(tenant: TenantDocument, dto: CreateAttractionDto): Promise<AttractionDocument> {
    const doc = await this.model.create({ ...dto, tenantId: tenant.id });
    await this.embedAndUpsert(doc, tenant);
    return doc;
  }

  async bulkCreate(tenant: TenantDocument, dtos: CreateAttractionDto[]): Promise<AttractionDocument[]> {
    const docs = await this.model.insertMany(
      dtos.map((d) => ({ ...d, tenantId: tenant.id })),
      { ordered: false },
    ) as unknown as AttractionDocument[];

    // Embed in parallel, swallow individual errors
    await Promise.allSettled(docs.map((doc) => this.embedAndUpsert(doc, tenant)));
    return docs;
  }

  async findAll(tenantId: string): Promise<AttractionDocument[]> {
    return this.model.find({ tenantId, isActive: true }).sort({ createdAt: -1 }).exec();
  }

  async findOne(tenantId: string, id: string): Promise<AttractionDocument> {
    const doc = await this.model.findOne({ _id: id, tenantId }).exec();
    if (!doc) throw new NotFoundException(`Attraction ${id} not found`);
    return doc;
  }

  async update(tenant: TenantDocument, id: string, dto: UpdateAttractionDto): Promise<AttractionDocument> {
    const doc = await this.model
      .findOneAndUpdate({ _id: id, tenantId: tenant.id }, dto, { new: true })
      .exec();
    if (!doc) throw new NotFoundException(`Attraction ${id} not found`);
    await this.embedAndUpsert(doc, tenant);
    return doc;
  }

  async remove(tenant: TenantDocument, id: string): Promise<void> {
    const doc = await this.model.findOneAndDelete({ _id: id, tenantId: tenant.id }).exec();
    if (!doc) throw new NotFoundException(`Attraction ${id} not found`);
    await this.qdrant.delete(tenant.id, id).catch((err) =>
      this.logger.warn(`Qdrant delete skipped for ${id}: ${(err as Error).message}`),
    );
  }

  async reindex(tenant: TenantDocument): Promise<{ reindexed: number; failed: number }> {
    const docs = await this.model.find({ tenantId: tenant.id, isActive: true }).exec();
    const results = await Promise.allSettled(docs.map((doc) => this.embedAndUpsert(doc, tenant)));
    const failed = results.filter((r) => r.status === 'rejected').length;
    return { reindexed: results.length - failed, failed };
  }
}
