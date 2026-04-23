import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import configuration from './config/configuration';
import { HealthModule } from './modules/health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { TenantsModule } from './modules/tenants/tenant.module';
import { AttractionsModule } from './modules/attractions/attraction.module';
import { RagModule } from './modules/rag/rag.module';
import { LlmModule } from './modules/llm/llm.module';
import { SettingsModule } from './modules/settings/settings.module';
import { ChatModule } from './modules/chat/chat.module';
import { AdminAuthModule } from './modules/admin-auth/admin-auth.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { WidgetModule } from './modules/widget/widget.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: ['.env', '.env.local'],
    }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 60 }]),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        uri: config.get<string>('database.mongoUri'),
        connectionFactory: (connection) => {
          connection.on('connected', () => console.log('MongoDB connected'));
          connection.on('error', (err) => console.error('MongoDB error:', err));
          return connection;
        },
      }),
      inject: [ConfigService],
    }),
    HealthModule,
    AuthModule,
    TenantsModule,
    RagModule,
    AttractionsModule,
    LlmModule,
    SettingsModule,
    ChatModule,
    AdminAuthModule,
    AnalyticsModule,
    WidgetModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
