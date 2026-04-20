import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { TenantsService } from '../tenants/tenant.service';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly tenantsService: TenantsService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const apiKey = request.headers['x-api-key'] as string;

    if (!apiKey) {
      throw new UnauthorizedException('API key required in x-api-key header');
    }

    const tenant = await this.tenantsService.findByApiKey(apiKey);

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
