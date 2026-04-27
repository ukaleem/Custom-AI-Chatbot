import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SuperAdmin, SuperAdminSchema } from './schemas/super-admin.schema';
import { SuperAdminService } from './super-admin.service';
import { SuperAdminJwtStrategy } from './super-admin-jwt.strategy';
import { SuperAdminJwtGuard } from './super-admin-jwt.guard';
import { SuperAdminController } from './super-admin.controller';
import { TenantsModule } from '../tenants/tenant.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: SuperAdmin.name, schema: SuperAdminSchema }]),
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('security.jwtSecret') ?? 'changeme',
        signOptions: { expiresIn: '8h' },
      }),
      inject: [ConfigService],
    }),
    TenantsModule,
  ],
  providers: [SuperAdminService, SuperAdminJwtStrategy, SuperAdminJwtGuard],
  controllers: [SuperAdminController],
  exports: [SuperAdminJwtGuard],
})
export class SuperAdminModule {}
