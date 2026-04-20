import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class SetPasswordDto {
  @ApiProperty({ example: 'mySecurePassword123' })
  @IsString()
  @MinLength(8)
  password: string;
}
