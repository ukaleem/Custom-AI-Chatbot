import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Tenant, TenantDocument } from '../tenants/schemas/tenant.schema';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(
    @InjectModel(Tenant.name) private readonly tenantModel: Model<TenantDocument>,
  ) { }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const apiKey = request.headers['x-api-key'] as string;

    if (!apiKey) {
      throw new UnauthorizedException('API key required in x-api-key header');
    }

    const tenant = await this.tenantModel.findOne({ apiKey }).exec();

    if (!tenant) {
      throw new UnauthorizedException('Invalid API key');
    }

    if (!tenant.isActive) {
      throw new UnauthorizedException('This tenant account is inactive. Contact support.');
    }

    request['tenant'] = tenant;
    return true;
  }
}
