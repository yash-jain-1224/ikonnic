import { IsString, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class LogoutDto {
  @ApiPropertyOptional({ description: 'Refresh token to revoke (optional — revokes all if omitted)' })
  @IsOptional()
  @IsString()
  refreshToken?: string;
}
