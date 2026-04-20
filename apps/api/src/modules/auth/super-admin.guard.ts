import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SuperAdminGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const adminKey = request.headers['x-admin-key'] as string;
    const superAdminKey = this.config.get<string>('security.superAdminKey');

    if (!superAdminKey) {
      throw new UnauthorizedException('Super admin key is not configured on the server');
    }

    if (!adminKey || adminKey !== superAdminKey) {
      throw new UnauthorizedException('Valid super-admin key required in x-admin-key header');
    }

    return true;
  }
}
