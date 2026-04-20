import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { Tenant, TenantDocument } from '../tenants/schemas/tenant.schema';

export interface JwtPayload {
  tenantId: string;
  slug: string;
  role: 'admin';
}

@Injectable()
export class AdminAuthService {
  constructor(
    @InjectModel(Tenant.name) private readonly tenantModel: Model<TenantDocument>,
    private readonly jwtService: JwtService,
  ) {}

  async login(slug: string, password: string) {
    const tenant = await this.tenantModel
      .findOne({ slug, isActive: true })
      .select('+adminPasswordHash +apiKey')
      .exec();

    if (!tenant) throw new UnauthorizedException('Invalid credentials');
    if (!tenant.adminPasswordHash) {
      throw new UnauthorizedException('Admin password not set — contact your administrator');
    }

    const valid = await bcrypt.compare(password, tenant.adminPasswordHash);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    const payload: JwtPayload = { tenantId: tenant._id.toString(), slug: tenant.slug, role: 'admin' };
    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      apiKey: tenant.apiKey,
      tenant: {
        id: tenant._id.toString(),
        slug: tenant.slug,
        name: tenant.name,
        plan: tenant.plan,
        botConfig: tenant.botConfig,
      },
    };
  }

  async setPassword(tenantId: string, password: string): Promise<void> {
    const hash = await bcrypt.hash(password, 12);
    await this.tenantModel.findByIdAndUpdate(tenantId, { $set: { adminPasswordHash: hash } }).exec();
  }
}
