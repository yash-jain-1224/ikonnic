import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class MergeCartDto {
  @ApiProperty({ example: 'guest-session-uuid-123', description: 'Guest session ID to merge from' })
  @IsString()
  @IsNotEmpty()
  guestSessionId: string;
}
