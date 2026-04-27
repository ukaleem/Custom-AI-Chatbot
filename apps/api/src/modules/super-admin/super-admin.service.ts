import { Injectable, Logger, OnApplicationBootstrap, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { JwtService } from '@nestjs/jwt';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { SuperAdmin, SuperAdminDocument } from './schemas/super-admin.schema';

export interface SuperAdminJwtPayload {
  sub: string;
  email: string;
  role: 'super-admin';
}

@Injectable()
export class SuperAdminService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SuperAdminService.name);

  constructor(
    @InjectModel(SuperAdmin.name) private readonly model: Model<SuperAdminDocument>,
    private readonly jwtService: JwtService,
  ) {}

  // Seed default super-admin account on first boot
  async onApplicationBootstrap() {
    const existing = await this.model.findOne().exec();
    if (!existing) {
      const defaultEmail = process.env.SUPER_ADMIN_EMAIL ?? 'ukaleem540@gmail.com';
      const defaultPassword = process.env.SUPER_ADMIN_PASSWORD ?? '12345678';
      const passwordHash = await bcrypt.hash(defaultPassword, 12);
      await this.model.create({ email: defaultEmail, passwordHash, name: 'Kaleem Ullah' });
      this.logger.log(`Super-admin seeded: ${defaultEmail}`);
    }
  }

  async login(email: string, password: string): Promise<{ accessToken: string; name: string; email: string }> {
    const admin = await this.model.findOne({ email: email.toLowerCase() }).exec();
    if (!admin) throw new UnauthorizedException('Invalid email or password');

    const valid = await bcrypt.compare(password, admin.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid email or password');

    const payload: SuperAdminJwtPayload = {
      sub: admin._id.toString(),
      email: admin.email,
      role: 'super-admin',
    };

    return {
      accessToken: this.jwtService.sign(payload),
      name: admin.name,
      email: admin.email,
    };
  }

  async changePassword(email: string, currentPassword: string, newPassword: string): Promise<void> {
    const admin = await this.model.findOne({ email }).exec();
    if (!admin) throw new UnauthorizedException('Account not found');

    const valid = await bcrypt.compare(currentPassword, admin.passwordHash);
    if (!valid) throw new UnauthorizedException('Current password is incorrect');

    const newHash = await bcrypt.hash(newPassword, 12);
    await this.model.findByIdAndUpdate(admin._id, { $set: { passwordHash: newHash } }).exec();
  }

  async validatePayload(payload: SuperAdminJwtPayload): Promise<SuperAdminDocument | null> {
    if (payload.role !== 'super-admin') return null;
    return this.model.findById(payload.sub).exec();
  }
}
