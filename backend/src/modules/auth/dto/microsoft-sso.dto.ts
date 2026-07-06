import { ApiProperty } from '@nestjs/swagger';
import { IsJWT, IsNotEmpty, IsString } from 'class-validator';

export class MicrosoftSsoDto {
  @ApiProperty({ description: 'Azure Entra ID (Microsoft identity platform v2.0) ID token' })
  @IsString()
  @IsNotEmpty()
  @IsJWT()
  idToken: string;
}
