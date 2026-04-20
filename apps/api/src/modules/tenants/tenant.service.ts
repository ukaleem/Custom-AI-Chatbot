import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import * as bcrypt from 'bcrypt';
import { Tenant, TenantDocument } from './schemas/tenant.schema';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';

@Injectable()
export class TenantsService {
  constructor(
    @InjectModel(Tenant.name) private readonly tenantModel: Model<TenantDocument>,
  ) {}

  async create(dto: CreateTenantDto): Promise<TenantDocument> {
    const existing = await this.tenantModel.findOne({ slug: dto.slug }).exec();
    if (existing) {
      throw new ConflictException(`A tenant with slug "${dto.slug}" already exists`);
    }

    const tenant = new this.tenantModel({
      ...dto,
      apiKey: this.generateApiKey(),
    });

    return tenant.save();
  }

  async findAll(): Promise<TenantDocument[]> {
    return this.tenantModel.find().select('-apiKey').sort({ createdAt: -1 }).exec();
  }

  async findById(id: string): Promise<TenantDocument> {
    const tenant = await this.tenantModel.findById(id).select('-apiKey').exec();
    if (!tenant) throw new NotFoundException(`Tenant not found`);
    return tenant;
  }

  async findByApiKey(apiKey: string): Promise<TenantDocument | null> {
    return this.tenantModel.findOne({ apiKey }).exec();
  }

  async update(id: string, dto: UpdateTenantDto): Promise<TenantDocument> {
    const tenant = await this.tenantModel
      .findByIdAndUpdate(id, { $set: dto }, { new: true })
      .select('-apiKey')
      .exec();
    if (!tenant) throw new NotFoundException(`Tenant not found`);
    return tenant;
  }

  async regenerateApiKey(id: string): Promise<{ apiKey: string }> {
    const newKey = this.generateApiKey();
    const tenant = await this.tenantModel
      .findByIdAndUpdate(id, { $set: { apiKey: newKey } }, { new: true })
      .exec();
    if (!tenant) throw new NotFoundException(`Tenant not found`);
    return { apiKey: newKey };
  }

  async deactivate(id: string): Promise<void> {
    const result = await this.tenantModel
      .findByIdAndUpdate(id, { $set: { isActive: false } })
      .exec();
    if (!result) throw new NotFoundException(`Tenant not found`);
  }

  async findBySlug(slug: string): Promise<TenantDocument | null> {
    return this.tenantModel.findOne({ slug }).exec();
  }

  async incrementSessionCount(tenantId: string): Promise<void> {
    await this.tenantModel
      .findByIdAndUpdate(tenantId, {
        $inc: {
          'usage.currentMonthSessions': 1,
          'usage.totalSessionsAllTime': 1,
        },
      })
      .exec();
  }

  async setAdminPassword(id: string, password: string): Promise<void> {
    const hash = await bcrypt.hash(password, 12);
    const result = await this.tenantModel
      .findByIdAndUpdate(id, { $set: { adminPasswordHash: hash } })
      .exec();
    if (!result) throw new NotFoundException('Tenant not found');
  }

  private generateApiKey(): string {
    return `cac_${uuidv4().replace(/-/g, '')}`;
  }
}
