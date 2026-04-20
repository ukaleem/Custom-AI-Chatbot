import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateLlmConfigDto {
  @ApiProperty({
    enum: ['openai', 'anthropic', 'gemini', 'mistral'],
    example: 'openai',
    description: 'Your LLM provider choice',
  })
  @IsString()
  @IsIn(['openai', 'anthropic', 'gemini', 'mistral'])
  provider: 'openai' | 'anthropic' | 'gemini' | 'mistral';

  @ApiProperty({
    example: 'sk-...',
    description: 'API key from your chosen LLM provider — stored encrypted, never returned',
  })
  @IsString()
  @MinLength(10)
  apiKey: string;

  @ApiPropertyOptional({
    example: 'gpt-4o',
    description: 'Model ID (optional — defaults to recommended model for the provider)',
  })
  @IsOptional()
  @IsString()
  model?: string;

  @ApiPropertyOptional({
    example: 'text-embedding-3-small',
    description: 'Embedding model (optional — used for vector search)',
  })
  @IsOptional()
  @IsString()
  embeddingModel?: string;
}
