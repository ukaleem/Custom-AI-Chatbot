import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsArray, IsHexColor, IsOptional, IsString, IsUrl, MinLength } from 'class-validator';

// Convert empty strings to undefined so @IsOptional() correctly skips them.
// Without this, '' passes @IsOptional() but then fails @IsUrl(), @IsHexColor(), @MinLength() etc.
const emptyToUndefined = () => Transform(({ value }) => (value === '' || value == null ? undefined : value));

export class UpdateBotConfigDto {
  @ApiPropertyOptional({ example: 'Catania Guide' })
  @IsOptional()
  @emptyToUndefined()
  @IsString()
  @MinLength(2)
  botName?: string;

  @ApiPropertyOptional({ example: 'Welcome to Catania! How can I help you today?' })
  @IsOptional()
  @emptyToUndefined()
  @IsString()
  greeting?: string;

  @ApiPropertyOptional({ example: '#2563EB' })
  @IsOptional()
  @emptyToUndefined()
  @IsHexColor()
  primaryColor?: string;

  @ApiPropertyOptional({ example: 'https://example.com/logo.png' })
  @IsOptional()
  @emptyToUndefined()
  @IsUrl()
  logoUrl?: string;

  @ApiPropertyOptional({ example: 'en' })
  @IsOptional()
  @emptyToUndefined()
  @IsString()
  defaultLanguage?: string;

  @ApiPropertyOptional({ example: ['en', 'it', 'de'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  supportedLanguages?: string[];

  @ApiPropertyOptional({ example: 'tourist-guide', description: 'Bot persona key from the persona library or "custom"' })
  @IsOptional()
  @emptyToUndefined()
  @IsString()
  persona?: string;

  @ApiPropertyOptional({ example: 'You are a friendly assistant...', description: 'Custom system instruction (used when persona is "custom")' })
  @IsOptional()
  @IsString()
  systemInstruction?: string;
}
