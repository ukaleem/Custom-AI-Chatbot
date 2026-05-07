import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { KnowledgeItem, KnowledgeItemDocument } from './schemas/knowledge-item.schema';
import { CreateKnowledgeItemDto, UpdateKnowledgeItemDto, ImportRawDataDto } from './dto/knowledge-item.dto';
import { DataParserService } from './parsers/data-parser.service';
import { TenantDocument } from '../tenants/schemas/tenant.schema';
import { QdrantService } from '../rag/qdrant.service';
import { EmbeddingService } from '../rag/embedding.service';

@Injectable()
export class KnowledgeItemService {
  private readonly logger = new Logger(KnowledgeItemService.name);

  constructor(
    @InjectModel(KnowledgeItem.name) private readonly model: Model<KnowledgeItemDocument>,
    private readonly qdrant: QdrantService,
    private readonly embedding: EmbeddingService,
    private readonly parser: DataParserService,
  ) {}

  // ─── CRUD ─────────────────────────────────────────────────────────────────

  async create(tenant: TenantDocument, dto: CreateKnowledgeItemDto): Promise<KnowledgeItemDocument> {
    const doc = await this.model.create({ ...dto, tenantId: tenant.id, source: dto.source ?? 'manual' });
    await this.embedAndUpsert(doc, tenant);
    return doc;
  }

  async bulkCreate(tenant: TenantDocument, items: CreateKnowledgeItemDto[], source = 'api'): Promise<{ created: number; failed: number }> {
    const docs = await this.model.insertMany(
      items.map(d => ({ ...d, tenantId: tenant.id, source })),
      { ordered: false },
    ) as unknown as KnowledgeItemDocument[];
    const results = await Promise.allSettled(docs.map(doc => this.embedAndUpsert(doc, tenant)));
    return { created: docs.length, failed: results.filter(r => r.status === 'rejected').length };
  }

  async importRaw(tenant: TenantDocument, dto: ImportRawDataDto): Promise<{ created: number; failed: number; detected: string; parsed: number }> {
    const { items, source, detected } = this.parser.parse(dto.data, dto.format ?? 'auto', dto.columnMap ?? {});
    if (!items.length) throw new BadRequestException('No valid records could be parsed from the provided data. Check the format and column names.');
    const result = await this.bulkCreate(tenant, items as CreateKnowledgeItemDto[], source);
    return { ...result, detected, parsed: items.length };
  }

  async findAll(
    tenantId: string,
    opts: { page: number; limit: number; search: string; category: string } = { page: 1, limit: 20, search: '', category: '' },
  ) {
    const filter: Record<string, unknown> = { tenantId };
    if (opts.search) filter['$or'] = [
      { title: { $regex: opts.search, $options: 'i' } },
      { content: { $regex: opts.search, $options: 'i' } },
      { tags: { $regex: opts.search, $options: 'i' } },
    ];
    if (opts.category) filter['category'] = opts.category;

    const skip = (opts.page - 1) * opts.limit;
    const [items, total] = await Promise.all([
      this.model.find(filter).sort({ createdAt: -1 }).skip(skip).limit(opts.limit).exec(),
      this.model.countDocuments(filter),
    ]);
    return { items, total, page: opts.page, pages: Math.ceil(total / opts.limit) };
  }

  async findOne(tenantId: string, id: string): Promise<KnowledgeItemDocument> {
    const doc = await this.model.findOne({ _id: id, tenantId }).exec();
    if (!doc) throw new NotFoundException(`Knowledge item ${id} not found`);
    return doc;
  }

  async update(tenant: TenantDocument, id: string, dto: UpdateKnowledgeItemDto): Promise<KnowledgeItemDocument> {
    const doc = await this.model.findOneAndUpdate({ _id: id, tenantId: tenant.id }, dto, { new: true }).exec();
    if (!doc) throw new NotFoundException(`Knowledge item ${id} not found`);
    await this.embedAndUpsert(doc, tenant);
    return doc;
  }

  async remove(tenant: TenantDocument, id: string): Promise<void> {
    const doc = await this.model.findOneAndDelete({ _id: id, tenantId: tenant.id }).exec();
    if (!doc) throw new NotFoundException(`Knowledge item ${id} not found`);
    await this.qdrant.delete(tenant.id, id).catch(err =>
      this.logger.warn(`Qdrant delete skipped: ${(err as Error).message}`)
    );
  }

  async getCategories(tenantId: string): Promise<string[]> {
    const cats = await this.model.distinct('category', { tenantId }).exec();
    return (cats as string[]).filter(Boolean).sort();
  }

  async reindex(tenant: TenantDocument): Promise<{ reindexed: number; failed: number }> {
    const docs = await this.model.find({ tenantId: tenant.id, isActive: true }).exec();
    const results = await Promise.allSettled(docs.map(doc => this.embedAndUpsert(doc, tenant)));
    return { reindexed: results.length - results.filter(r => r.status === 'rejected').length, failed: results.filter(r => r.status === 'rejected').length };
  }

  // ─── Migration from attractions ───────────────────────────────────────────

  async migrateFromAttractions(tenant: TenantDocument): Promise<{ migrated: number }> {
    const Attraction = this.model.db.model('Attraction');
    const attractions = await (Attraction as any).find({ tenantId: tenant.id }).lean().exec();
    const items: CreateKnowledgeItemDto[] = attractions.map((a: any) => ({
      title: a.name?.en ?? a.name ?? 'Unnamed',
      content: a.description?.en ?? a.description ?? '',
      summary: a.shortDescription?.en ?? a.shortDescription ?? '',
      category: a.category ?? 'general',
      tags: a.tags ?? [],
      metadata: {
        address: a.address, location: a.location,
        priceRange: a.priceRange, durationMinutes: a.durationMinutes,
        foodStyle: a.foodStyle, imageUrl: a.imageUrl, websiteUrl: a.websiteUrl,
      },
      isActive: a.isActive ?? true,
      source: 'api',
    }));
    const result = await this.bulkCreate(tenant, items, 'api');
    return { migrated: result.created };
  }

  // ─── Delete invalid / garbage items ─────────────────────────────────────

  async deleteInvalid(tenant: TenantDocument): Promise<{ deleted: number; examples: string[] }> {
    // Garbage items have:
    // - Purely numeric title (e.g. "76", "89") → database row IDs used as title
    // - Title is 1–2 chars (too short to be meaningful)
    // - Content equals the title (no real content was found)
    const all = await this.model.find({ tenantId: tenant.id }).lean().exec();
    const garbage = all.filter(item => {
      const t = (item.title || '').trim();
      const c = (item.content || '').trim();
      const isNumeric = /^\d+$/.test(t);
      const isTooShort = t.length <= 2;
      const noContent = c === t || c.length < 5;
      return isNumeric || isTooShort || noContent;
    });

    if (!garbage.length) return { deleted: 0, examples: [] };

    const ids = garbage.map(g => g._id);
    const result = await this.model.deleteMany({ _id: { $in: ids }, tenantId: tenant.id }).exec();
    return {
      deleted: result.deletedCount ?? 0,
      examples: garbage.slice(0, 5).map(g => g.title),
    };
  }

  // ─── Purge all ────────────────────────────────────────────────────────────

  async purgeAll(tenant: TenantDocument): Promise<{ deleted: number }> {
    const result = await this.model.deleteMany({ tenantId: tenant.id }).exec();
    // Also clear the Qdrant collection for this tenant
    try {
      await this.qdrant.delete(tenant.id, '*' as any).catch(() => {});
      // Recreate empty collection
    } catch { /* ignore */ }
    return { deleted: result.deletedCount ?? 0 };
  }

  // ─── Analytics ────────────────────────────────────────────────────────────

  async getAnalytics(tenantId: string) {
    const [
      total, active, byCategory, bySource,
      withSummary, withTags, avgContentLen
    ] = await Promise.all([
      this.model.countDocuments({ tenantId }),
      this.model.countDocuments({ tenantId, isActive: true }),
      this.model.aggregate([
        { $match: { tenantId } },
        { $group: { _id: '$category', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      this.model.aggregate([
        { $match: { tenantId } },
        { $group: { _id: '$source', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      this.model.countDocuments({ tenantId, summary: { $ne: '', $exists: true } }),
      this.model.countDocuments({ tenantId, tags: { $exists: true, $not: { $size: 0 } } }),
      this.model.aggregate([
        { $match: { tenantId } },
        { $project: { len: { $strLenCP: '$content' } } },
        { $group: { _id: null, avg: { $avg: '$len' } } },
      ]),
    ]);

    const avgLen = Math.round(avgContentLen[0]?.avg ?? 0);
    const incompleteItems = total - withSummary;
    const noTagsItems    = total - withTags;

    // Quality score: 0–100
    let score = 0;
    if (total === 0) {
      score = 0;
    } else {
      score += Math.min(40, Math.round((active / total) * 40));           // active ratio (40pts)
      score += Math.min(25, Math.round((withSummary / total) * 25));      // has summary (25pts)
      score += Math.min(20, Math.round((withTags / total) * 20));         // has tags (20pts)
      score += Math.min(15, Math.round(Math.min(avgLen / 500, 1) * 15));  // content richness (15pts)
    }

    const grade = score >= 80 ? 'Excellent' : score >= 60 ? 'Good' : score >= 40 ? 'Fair' : 'Needs improvement';
    const gradeColor = score >= 80 ? '#16a34a' : score >= 60 ? '#2563eb' : score >= 40 ? '#d97706' : '#dc2626';

    const suggestions: string[] = [];
    if (total < 10)           suggestions.push(`Add more items — ${total} items is a thin knowledge base (aim for 20+)`);
    if (incompleteItems > 0)  suggestions.push(`${incompleteItems} items have no summary — add a one-line summary for better bot answers`);
    if (noTagsItems > 0)      suggestions.push(`${noTagsItems} items have no tags — add tags to improve search accuracy`);
    if (avgLen < 100)         suggestions.push('Content is very short — add more details so the bot can give complete answers');
    if (active < total)       suggestions.push(`${total - active} items are inactive — activate them or delete them`);

    return {
      total, active, inactive: total - active,
      completeness: { withSummary, withTags, avgContentLength: avgLen },
      byCategory: byCategory.map(c => ({ category: c._id || 'uncategorised', count: c.count })),
      bySource: bySource.map(s => ({ source: s._id || 'unknown', count: s.count })),
      quality: { score, grade, gradeColor },
      suggestions,
    };
  }

  // ─── Embedding ────────────────────────────────────────────────────────────

  private async embedAndUpsert(doc: KnowledgeItemDocument, tenant: TenantDocument): Promise<void> {
    try {
      const llmConfig = await this.getLlmConfig(tenant.id);
      if (!llmConfig?.apiKey) {
        this.logger.warn(`Embed skipped for ${doc.id} — no LLM key configured`);
        return;
      }
      const text = [doc.title, doc.summary, doc.content, doc.tags.join(' ')].filter(Boolean).join('\n');
      const vector = await this.embedding.embedAttraction({ name: { en: text }, description: { en: doc.content }, shortDescription: { en: doc.summary }, tags: doc.tags, category: doc.category } as any, llmConfig.apiKey);
      await this.qdrant.upsert(tenant.id, doc.id, vector, {
        mongoId: doc.id, tenantId: tenant.id, name: doc.title,
        category: doc.category, tags: doc.tags, isActive: doc.isActive,
      });
    } catch (err) {
      this.logger.warn(`Embed skipped for ${doc.id}: ${(err as Error).message}`);
    }
  }

  private async getLlmConfig(tenantId: string) {
    const tenant = await this.model.db.model('Tenant').findById(tenantId).select('+llmConfig').lean().exec() as any;
    return tenant?.llmConfig;
  }
}
