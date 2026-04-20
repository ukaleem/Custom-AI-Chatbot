import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';

export class StartSessionDto {
  @ApiPropertyOptional({ example: 'en', description: 'Preferred language (auto-detected if omitted)' })
  @IsOptional()
  @IsString()
  @IsIn(['en', 'it', 'de', 'fr', 'es'])
  language?: string;
}
