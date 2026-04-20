import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Conversation, ConversationDocument } from '../chat/schemas/conversation.schema';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectModel(Conversation.name) private readonly convModel: Model<ConversationDocument>,
  ) {}

  async getOverview(tenantId: string) {
    const tid = new Types.ObjectId(tenantId);
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [total, today, thisMonth, active, languageCounts] = await Promise.all([
      this.convModel.countDocuments({ tenantId: tid }),
      this.convModel.countDocuments({ tenantId: tid, createdAt: { $gte: todayStart } }),
      this.convModel.countDocuments({ tenantId: tid, createdAt: { $gte: monthStart } }),
      this.convModel.countDocuments({ tenantId: tid, isActive: true }),
      this.convModel.aggregate([
        { $match: { tenantId: tid } },
        { $group: { _id: '$language', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
    ]);

    return {
      sessions: { total, today, thisMonth, active },
      languages: languageCounts.map((l) => ({ language: l._id ?? 'unknown', count: l.count })),
    };
  }

  async getConversations(tenantId: string, page = 1, limit = 20) {
    const tid = new Types.ObjectId(tenantId);
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.convModel
        .find({ tenantId: tid })
        .select('sessionId currentState language collectedParams isActive lastMessageAt createdAt')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      this.convModel.countDocuments({ tenantId: tid }),
    ]);

    return {
      items,
      total,
      page,
      pages: Math.ceil(total / limit),
    };
  }

  async getConversationDetail(tenantId: string, sessionId: string) {
    return this.convModel
      .findOne({ tenantId: new Types.ObjectId(tenantId), sessionId })
      .lean()
      .exec();
  }
}
