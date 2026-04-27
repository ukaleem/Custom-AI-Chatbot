import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as path from 'path';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Security headers — relax for Swagger UI and widget iframe embedding
  app.use(helmet({
    contentSecurityPolicy: false,   // Swagger UI uses inline scripts
    crossOriginEmbedderPolicy: false,
  }));

  // Serve built widget bundle from dist/apps/widget/
  app.useStaticAssets(path.join(process.cwd(), 'dist', 'apps', 'widget'), {
    prefix: '/widget',
  });

  app.setGlobalPrefix('api/v1');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',').filter(Boolean) ?? [];
  app.enableCors({
    origin: (origin, callback) => {
      // No origin header = same-origin or curl/Postman → allow
      // 'null' = file:// opened in browser → allow (widget dev testing)
      // Empty allowlist = no restriction configured → allow all
      if (!origin || origin === 'null' || allowedOrigins.length === 0) {
        return callback(null, true);
      }
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      callback(null, false);
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'x-api-key', 'x-admin-key', 'Authorization'],
    credentials: true,
  });

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Custom AI Chatbot API')
    .setDescription(
      `## Multi-Tenant AI Tourist Guide Chatbot Platform

### Authentication
- **Tenant API Key** — pass in header \`x-api-key\` for all chat/widget endpoints
- **Super Admin Key** — pass in header \`x-admin-key\` for tenant management

### Getting Started
1. Create a tenant via \`POST /api/v1/tenants\` (super-admin only)
2. Save the returned \`apiKey\`
3. Use that key in \`x-api-key\` header for all bot interactions`,
    )
    .setVersion('1.0')
    .addApiKey({ type: 'apiKey', in: 'header', name: 'x-api-key' }, 'tenant-api-key')
    .addApiKey({ type: 'apiKey', in: 'header', name: 'x-admin-key' }, 'super-admin-key')
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'admin-jwt')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: { persistAuthorization: true },
  });

  const port = process.env.PORT ?? 3000;
  await app.listen(port);

  console.log(`\n🤖 Custom AI Chatbot API`);
  console.log(`   API:    http://localhost:${port}/api/v1`);
  console.log(`   Docs:   http://localhost:${port}/api/docs`);
  console.log(`   Health: http://localhost:${port}/api/v1/health\n`);
}

bootstrap();
