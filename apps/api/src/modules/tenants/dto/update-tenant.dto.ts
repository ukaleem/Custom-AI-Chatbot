import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsBoolean, IsObject, IsOptional } from 'class-validator';
import { CreateTenantDto } from './create-tenant.dto';

export class UpdateTenantDto extends PartialType(CreateTenantDto) {
  @ApiPropertyOptional({ example: true, description: 'Activate or deactivate the tenant' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Bot personality and appearance configuration',
    example: {
      botName: 'Catania Guide',
      greeting: 'Ciao! I am your Catania City Pass guide!',
      primaryColor: '#FF6B35',
      logoUrl: 'https://example.com/logo.png',
      defaultLanguage: 'it',
      supportedLanguages: ['en', 'it', 'de'],
    },
  })
  @IsOptional()
  @IsObject()
  botConfig?: Record<string, unknown>;
}
