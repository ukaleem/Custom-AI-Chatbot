import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsString, IsOptional, IsArray, IsBoolean, IsObject, MinLength, IsIn } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateKnowledgeItemDto {
  @ApiProperty({ example: 'How to reset your password' })
  @IsString() @MinLength(1)
  title: string;

  @ApiProperty({ example: 'Go to Settings → Security → Reset Password and follow the steps.' })
  @IsString() @MinLength(1)
  content: string;

  @ApiPropertyOptional({ example: 'Step-by-step guide to reset your password.' })
  @IsOptional() @IsString()
  summary?: string;

  @ApiPropertyOptional({ example: 'support' })
  @IsOptional() @IsString()
  @Transform(({ value }) => value || 'general')
  category?: string;

  @ApiPropertyOptional({ example: ['password', 'account', 'security'] })
  @IsOptional() @IsArray() @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: 'Any extra structured fields from source data' })
  @IsOptional() @IsObject()
  metadata?: Record<string, unknown>;

  @ApiPropertyOptional({ enum: ['manual', 'csv', 'sql', 'json', 'api'] })
  @IsOptional() @IsIn(['manual', 'csv', 'sql', 'json', 'api'])
  source?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional() @IsBoolean()
  isActive?: boolean;
}

export class UpdateKnowledgeItemDto extends PartialType(CreateKnowledgeItemDto) {}

export class BulkImportKnowledgeDto {
  @ApiProperty({ type: [CreateKnowledgeItemDto] })
  @IsArray()
  items: CreateKnowledgeItemDto[];
}

export class ImportRawDataDto {
  @ApiProperty({
    description: 'Raw data string — CSV, JSON array, or SQL INSERT statements. Format is auto-detected.',
    example: 'title,content,category\n"FAQ 1","Answer 1","support"',
  })
  @IsString() @MinLength(1)
  data: string;

  @ApiPropertyOptional({ description: 'Force format detection: csv | sql | json | auto', default: 'auto' })
  @IsOptional() @IsString()
  format?: 'csv' | 'sql' | 'json' | 'auto';

  @ApiPropertyOptional({ description: 'Column mapping overrides e.g. {"name":"title","body":"content"}' })
  @IsOptional() @IsObject()
  columnMap?: Record<string, string>;
}
