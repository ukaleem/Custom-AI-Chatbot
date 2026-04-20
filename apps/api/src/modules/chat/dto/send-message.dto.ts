import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength, MaxLength } from 'class-validator';

export class SendMessageDto {
  @ApiProperty({ example: 'sess_abc123', description: 'Session ID from POST /chat/session' })
  @IsString()
  @MinLength(1)
  sessionId: string;

  @ApiProperty({ example: 'I prefer culture and have 3 hours' })
  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  message: string;
}
