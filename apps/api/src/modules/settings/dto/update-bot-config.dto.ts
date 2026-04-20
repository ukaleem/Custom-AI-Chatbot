import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsHexColor, IsOptional, IsString, IsUrl, MinLength } from 'class-validator';

export class UpdateBotConfigDto {
  @ApiPropertyOptional({ example: 'Catania Guide' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  botName?: string;

  @ApiPropertyOptional({ example: 'Welcome to Catania! How can I help you today?' })
  @IsOptional()
  @IsString()
  greeting?: string;

  @ApiPropertyOptional({ example: '#2563EB' })
  @IsOptional()
  @IsHexColor()
  primaryColor?: string;

  @ApiPropertyOptional({ example: 'https://example.com/logo.png' })
  @IsOptional()
  @IsUrl()
  logoUrl?: string;

  @ApiPropertyOptional({ example: 'en' })
  @IsOptional()
  @IsString()
  defaultLanguage?: string;

  @ApiPropertyOptional({ example: ['en', 'it', 'de'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  supportedLanguages?: string[];
}
