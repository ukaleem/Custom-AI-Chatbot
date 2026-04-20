import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class AdminLoginDto {
  @ApiProperty({ example: 'catania-city-pass' })
  @IsString()
  slug: string;

  @ApiProperty({ example: 'mySecurePassword123' })
  @IsString()
  @MinLength(8)
  password: string;
}
