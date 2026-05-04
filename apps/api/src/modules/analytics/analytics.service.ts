import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Conversation, ConversationDocument } from '../chat/schemas/conversation.schema';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectModel(Conversation.name) private readonly convModel: Model<ConversationDocument>,
  ) {}

  // ─── Overview ─────────────────────────────────────────────────────────────

  async getOverview(tenantId: string) {
    const tid = new Types.ObjectId(tenantId);
    const now = new Date();
    const todayStart  = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart   = new Date(todayStart); weekStart.setDate(weekStart.getDate() - 6);
    const monthStart  = new Date(now.getFullYear(), now.getMonth(), 1);

    const [total, today, thisWeek, thisMonth, active, languageCounts, tokenAgg, modelAgg] = await Promise.all([
      this.convModel.countDocuments({ tenantId: tid }),
      this.convModel.countDocuments({ tenantId: tid, createdAt: { $gte: todayStart } }),
      this.convModel.countDocuments({ tenantId: tid, createdAt: { $gte: weekStart } }),
      this.convModel.countDocuments({ tenantId: tid, createdAt: { $gte: monthStart } }),
      this.convModel.countDocuments({ tenantId: tid, isActive: true }),
      this.convModel.aggregate([
        { $match: { tenantId: tid } },
        { $group: { _id: '$language', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      this.convModel.aggregate([
        { $match: { tenantId: tid } },
        { $group: { _id: null, totalInput: { $sum: '$totalInputTokens' }, totalOutput: { $sum: '$totalOutputTokens' } } },
      ]),
      this.convModel.aggregate([
        { $match: { tenantId: tid, modelUsed: { $ne: '' } } },
        { $group: { _id: '$modelUsed', sessions: { $sum: 1 }, inputTokens: { $sum: '$totalInputTokens' }, outputTokens: { $sum: '$totalOutputTokens' } } },
        { $sort: { sessions: -1 } },
      ]),
    ]);

    const tok = tokenAgg[0] ?? { totalInput: 0, totalOutput: 0 };

    return {
      sessions: { total, today, thisWeek, thisMonth, active },
      languages: languageCounts.map(l => ({ language: l._id ?? 'unknown', count: l.count })),
      tokens: {
        totalInputAllTime:  tok.totalInput,
        totalOutputAllTime: tok.totalOutput,
        totalAllTime: tok.totalInput + tok.totalOutput,
      },
      modelBreakdown: modelAgg.map(m => ({
        model: m._id,
        sessions: m.sessions,
        inputTokens: m.inputTokens,
        outputTokens: m.outputTokens,
        totalTokens: m.inputTokens + m.outputTokens,
      })),
    };
  }

  // ─── Daily stats (for line/bar charts) ────────────────────────────────────

  async getDailyStats(tenantId: string, days = 30) {
    const tid = new Types.ObjectId(tenantId);
    const since = new Date();
    since.setDate(since.getDate() - days + 1);
    since.setHours(0, 0, 0, 0);

    const raw = await this.convModel.aggregate([
      { $match: { tenantId: tid, createdAt: { $gte: since } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          sessions: { $sum: 1 },
          inputTokens: { $sum: '$totalInputTokens' },
          outputTokens: { $sum: '$totalOutputTokens' },
          avgMessages: { $avg: { $size: '$messages' } },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Fill in zero-count days
    const map = new Map(raw.map(r => [r._id, r]));
    const result = [];
    for (let i = 0; i < days; i++) {
      const d = new Date(since); d.setDate(d.getDate() + i);
      const key = d.toISOString().slice(0, 10);
      const entry = map.get(key);
      result.push({
        date: key,
        sessions: entry?.sessions ?? 0,
        inputTokens: entry?.inputTokens ?? 0,
        outputTokens: entry?.outputTokens ?? 0,
        totalTokens: (entry?.inputTokens ?? 0) + (entry?.outputTokens ?? 0),
        avgMessages: Math.round(entry?.avgMessages ?? 0),
      });
    }
    return result;
  }

  // ─── Token summary ────────────────────────────────────────────────────────

  async getTokenSummary(tenantId: string) {
    const tid = new Types.ObjectId(tenantId);
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart  = new Date(todayStart); weekStart.setDate(weekStart.getDate() - 6);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const agg = async (since: Date) =>
      this.convModel.aggregate([
        { $match: { tenantId: tid, createdAt: { $gte: since } } },
        { $group: { _id: null, input: { $sum: '$totalInputTokens' }, output: { $sum: '$totalOutputTokens' }, requests: { $sum: 1 } } },
      ]).then(r => r[0] ?? { input: 0, output: 0, requests: 0 });

    const [today, thisWeek, thisMonth, allTime] = await Promise.all([
      agg(todayStart),
      agg(weekStart),
      agg(monthStart),
      agg(new Date(0)),
    ]);

    return {
      today:     { inputTokens: today.input,     outputTokens: today.output,     total: today.input + today.output,     requests: today.requests },
      thisWeek:  { inputTokens: thisWeek.input,  outputTokens: thisWeek.output,  total: thisWeek.input + thisWeek.output,  requests: thisWeek.requests },
      thisMonth: { inputTokens: thisMonth.input, outputTokens: thisMonth.output, total: thisMonth.input + thisMonth.output, requests: thisMonth.requests },
      allTime:   { inputTokens: allTime.input,   outputTokens: allTime.output,   total: allTime.input + allTime.output,   requests: allTime.requests },
    };
  }

  // ─── Model breakdown ──────────────────────────────────────────────────────

  async getModelBreakdown(tenantId: string) {
    const tid = new Types.ObjectId(tenantId);
    return this.convModel.aggregate([
      { $match: { tenantId: tid, modelUsed: { $nin: ['', null, 'demo'] } } },
      {
        $group: {
          _id: '$modelUsed',
          sessions: { $sum: 1 },
          inputTokens: { $sum: '$totalInputTokens' },
          outputTokens: { $sum: '$totalOutputTokens' },
        },
      },
      { $sort: { sessions: -1 } },
      {
        $project: {
          model: '$_id', _id: 0, sessions: 1,
          inputTokens: 1, outputTokens: 1,
          totalTokens: { $add: ['$inputTokens', '$outputTokens'] },
        },
      },
    ]);
  }

  // ─── Conversations list ───────────────────────────────────────────────────

  async getConversations(tenantId: string, page = 1, limit = 20, filters: { language?: string; model?: string; minTokens?: number } = {}) {
    const tid = new Types.ObjectId(tenantId);
    const skip = (page - 1) * limit;
    const query: Record<string, unknown> = { tenantId: tid };
    if (filters.language) query['language'] = filters.language;
    if (filters.model) query['modelUsed'] = filters.model;
    if (filters.minTokens) query['$expr'] = { $gte: [{ $add: ['$totalInputTokens', '$totalOutputTokens'] }, filters.minTokens] };

    const [items, total] = await Promise.all([
      this.convModel
        .find(query)
        .select('sessionId currentState language collectedParams isActive lastMessageAt createdAt totalInputTokens totalOutputTokens modelUsed messages')
        .sort({ createdAt: -1 }).skip(skip).limit(limit).lean().exec(),
      this.convModel.countDocuments(query),
    ]);

    return {
      items: items.map(c => ({
        ...c,
        messageCount: (c as any).messages?.length ?? 0,
        totalTokens: ((c as any).totalInputTokens ?? 0) + ((c as any).totalOutputTokens ?? 0),
        messages: undefined,
      })),
      total, page, pages: Math.ceil(total / limit),
    };
  }

  // ─── Single conversation detail ───────────────────────────────────────────

  async getConversationDetail(tenantId: string, sessionId: string) {
    const conv = await this.convModel
      .findOne({ tenantId: new Types.ObjectId(tenantId), sessionId }).lean().exec();
    if (!conv) return null;
    return {
      ...conv,
      totalTokens: ((conv as any).totalInputTokens ?? 0) + ((conv as any).totalOutputTokens ?? 0),
      messageCount: conv.messages?.length ?? 0,
    };
  }
}
