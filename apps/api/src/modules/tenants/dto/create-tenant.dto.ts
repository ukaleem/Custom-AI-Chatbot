import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsIn, IsOptional, IsString, Matches, MinLength } from 'class-validator';

export class CreateTenantDto {
  @ApiProperty({ example: 'Catania City Pass', description: 'Company or app name' })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiProperty({
    example: 'catania-city-pass',
    description: 'Unique URL-safe identifier — lowercase letters, numbers, hyphens only',
  })
  @IsString()
  @Matches(/^[a-z0-9-]+$/, { message: 'Slug must be lowercase alphanumeric with hyphens only' })
  slug: string;

  @ApiProperty({ example: 'admin@cataniacitypass.com' })
  @IsEmail()
  adminEmail: string;

  @ApiPropertyOptional({
    example: 'starter',
    enum: ['starter', 'pro', 'enterprise'],
    default: 'starter',
  })
  @IsOptional()
  @IsString()
  @IsIn(['starter', 'pro', 'enterprise'])
  plan?: string;
}
