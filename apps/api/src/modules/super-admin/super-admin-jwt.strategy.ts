import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { SuperAdminService, SuperAdminJwtPayload } from './super-admin.service';

@Injectable()
export class SuperAdminJwtStrategy extends PassportStrategy(Strategy, 'super-admin-jwt') {
  constructor(config: ConfigService, private readonly superAdminService: SuperAdminService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('security.jwtSecret') ?? 'changeme',
    });
  }

  async validate(payload: SuperAdminJwtPayload) {
    if (payload.role !== 'super-admin') throw new UnauthorizedException('Super-admin access required');
    const admin = await this.superAdminService.validatePayload(payload);
    if (!admin) throw new UnauthorizedException('Super-admin account not found');
    return admin;
  }
}
