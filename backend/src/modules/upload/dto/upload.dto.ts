import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GetSasUrlDto {
  @ApiProperty({ example: 'products', description: 'Target folder in blob storage' })
  @IsString()
  @IsNotEmpty()
  folder: string;

  @ApiProperty({ example: 'photo-123.webp', description: 'Filename for the upload' })
  @IsString()
  @IsNotEmpty()
  filename: string;

  @ApiProperty({ example: 'image/webp', description: 'MIME type of the file' })
  @IsString()
  @IsNotEmpty()
  contentType: string;
}
