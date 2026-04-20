import { IsArray, ArrayMinSize, ArrayMaxSize, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { CreateAttractionDto } from './create-attraction.dto';

export class BulkImportDto {
  @ApiProperty({ type: [CreateAttractionDto], description: 'Up to 100 attractions' })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => CreateAttractionDto)
  attractions: CreateAttractionDto[];
}
