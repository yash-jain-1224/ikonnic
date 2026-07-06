import { IsString, IsNumber, IsOptional, IsObject, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AddToCartDto {
  @ApiProperty({ example: 'prod_1-portrait-acrylic-wall-photo_0' })
  @IsString()
  productId: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  quantity?: number = 1;

  // Accepted for backward compatibility but IGNORED: the server derives the
  // authoritative unit price from the product record.
  @ApiPropertyOptional({ example: 699 })
  @IsOptional()
  @IsNumber()
  unitPrice?: number;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsNumber()
  optionsPrice?: number = 0;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsNumber()
  discount?: number = 0;

  @ApiPropertyOptional({ example: { size: '8x10', thickness: '3mm', orientation: 'portrait' } })
  @IsOptional()
  @IsObject()
  selectedOptions?: Record<string, any>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  uploadedImagePreview?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  uploadedImageRef?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  previewImage?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  customisationJson?: Record<string, any>;
}
