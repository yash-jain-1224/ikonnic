import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SendOtpDto {
  @ApiProperty({ example: 'user@example.com', description: 'Email or phone number' })
  @IsString()
  identifier: string;

  @ApiProperty({ example: 'email_verification', description: 'Type: email_verification, phone_verification, password_reset' })
  @IsString()
  type: string;
}
