import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Tenant, TenantDocument } from '../tenants/schemas/tenant.schema';
import { JwtPayload } from './admin-auth.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    @InjectModel(Tenant.name) private readonly tenantModel: Model<TenantDocument>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('security.jwtSecret') ?? 'changeme',
    });
  }

  async validate(payload: JwtPayload): Promise<TenantDocument> {
    const tenant = await this.tenantModel
      .findOne({ _id: payload.tenantId, isActive: true })
      .exec();
    if (!tenant) throw new UnauthorizedException('Tenant not found or inactive');
    return tenant;
  }
}
