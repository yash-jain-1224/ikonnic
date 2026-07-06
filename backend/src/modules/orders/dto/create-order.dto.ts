import { IsString, IsNumber, IsOptional, IsArray, ValidateNested, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

class OrderItemDto {
  @ApiProperty()
  @IsString()
  productId: string;

  @ApiProperty()
  @IsString()
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sku?: string;

  @ApiProperty()
  @IsNumber()
  quantity: number;

  @ApiProperty()
  @IsNumber()
  unitPrice: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  optionsPrice?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  discount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  selectedOptions?: Record<string, any>;

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

export class CreateOrderDto {
  @ApiProperty({ type: [OrderItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  billingAddressId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  shippingAddressId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  couponCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  discount?: number;

  @ApiPropertyOptional({ example: 'COD', description: 'Payment method — currently only COD is supported' })
  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  customerNotes?: string;
}
