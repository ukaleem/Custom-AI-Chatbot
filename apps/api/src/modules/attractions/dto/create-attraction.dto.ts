import {
  IsString,
  IsEnum,
  IsArray,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsUrl,
  ValidateNested,
  Min,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AttractionCategory, FoodStyle, PriceRange } from '@custom-ai-chatbot/shared-types';

export class MultiLangTextDto {
  @ApiProperty()
  @IsString()
  en: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  it?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  de?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fr?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  es?: string;
}

export class CoordinatesDto {
  @ApiProperty()
  @IsNumber()
  lat: number;

  @ApiProperty()
  @IsNumber()
  lng: number;
}

export class OpeningHoursDto {
  @ApiPropertyOptional() @IsOptional() @IsString() monday?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() tuesday?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() wednesday?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() thursday?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() friday?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() saturday?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() sunday?: string;
}

const CATEGORIES: AttractionCategory[] = [
  'culture', 'entertainment', 'city-tour', 'food', 'transport',
  'children', 'healthcare', 'safety', 'shopping', 'nature',
];

export class CreateAttractionDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  externalId?: string;

  @ApiProperty()
  @ValidateNested()
  @Type(() => MultiLangTextDto)
  name: MultiLangTextDto;

  @ApiProperty()
  @ValidateNested()
  @Type(() => MultiLangTextDto)
  description: MultiLangTextDto;

  @ApiProperty()
  @ValidateNested()
  @Type(() => MultiLangTextDto)
  shortDescription: MultiLangTextDto;

  @ApiProperty({ enum: CATEGORIES })
  @IsEnum(CATEGORIES)
  category: AttractionCategory;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiProperty()
  @IsString()
  address: string;

  @ApiProperty()
  @ValidateNested()
  @Type(() => CoordinatesDto)
  location: CoordinatesDto;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => OpeningHoursDto)
  openingHours?: OpeningHoursDto;

  @ApiPropertyOptional({ enum: ['free', 'budget', 'mid-range', 'expensive'] })
  @IsOptional()
  @IsEnum(['free', 'budget', 'mid-range', 'expensive'])
  priceRange?: PriceRange;

  @ApiPropertyOptional({ enum: ['sitting', 'walking', 'both'] })
  @IsOptional()
  @IsEnum(['sitting', 'walking', 'both'])
  foodStyle?: FoodStyle;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  durationMinutes?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  websiteUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
