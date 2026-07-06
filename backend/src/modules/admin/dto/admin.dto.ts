import { IsString, IsNotEmpty, IsOptional, IsNumber, IsBoolean, IsArray, IsEnum, Min, Max, MaxLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional, PartialType, OmitType } from '@nestjs/swagger';
import { OrderStatus } from '@prisma/client';

// ─── Products ────────────────────────────────────────────────────────

export class ProductOptionInputDto {
  @ApiProperty({ example: '8x12 inches' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  label: string;

  @ApiProperty({ example: '8x12' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  value: string;

  @ApiPropertyOptional({ example: 200 })
  @IsOptional()
  @IsNumber()
  priceDelta?: number;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  disabled?: boolean;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsNumber()
  sortOrder?: number;
}

export class CreateProductDto {
  @ApiProperty({ example: 'Acrylic Wall Photo' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  @ApiPropertyOptional({ example: 'acrylic-wall-photo', description: 'Generated from title when omitted' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  slug?: string;

  @ApiPropertyOptional({ example: 'Beautiful acrylic wall photo with HD print' })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @ApiProperty({ example: 599 })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiPropertyOptional({ example: 'Long form marketing copy' })
  @IsOptional()
  @IsString()
  @MaxLength(20000)
  longDescription?: string;

  @ApiPropertyOptional({ example: 799, description: 'Strike-through compare-at price' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  oldPrice?: number;

  @ApiPropertyOptional({ example: 'category-cuid' })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional({ example: 'acrylic-wall-photo' })
  @IsOptional()
  @IsString()
  categorySlug?: string;

  @ApiPropertyOptional({ example: 'SKU-001' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  sku?: string;

  @ApiPropertyOptional({ example: '/images/products/hero.webp' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  image?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  gallery?: string[];

  @ApiPropertyOptional({ type: [String], example: ['Portrait', 'Gift'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  filterTags?: string[];

  @ApiPropertyOptional({ example: 'in_stock', enum: ['in_stock', 'low_stock', 'out_of_stock'] })
  @IsOptional()
  @IsString()
  stockStatus?: string;

  @ApiPropertyOptional({ example: 100, nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(0)
  stockCount?: number | null;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  sale?: boolean;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  featured?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ example: 18, description: 'GST rate percent' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  taxRate?: number;

  @ApiPropertyOptional({ example: '392611' })
  @IsOptional()
  @IsString()
  hsnCode?: string;

  @ApiPropertyOptional({ example: 200 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  weight?: number;

  @ApiPropertyOptional({ type: [ProductOptionInputDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductOptionInputDto)
  sizeOptions?: ProductOptionInputDto[];

  @ApiPropertyOptional({ type: [ProductOptionInputDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductOptionInputDto)
  thicknessOptions?: ProductOptionInputDto[];
}

export class UpdateProductDto extends PartialType(
  OmitType(CreateProductDto, ['title'] as const),
) {
  @ApiPropertyOptional({ example: 'Acrylic Wall Photo' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;
}

// ─── Categories ──────────────────────────────────────────────────────

export class CreateCategoryDto {
  @ApiProperty({ example: 'Wall Photos' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({ example: 'wall-photos', description: 'Generated from name when omitted' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  slug?: string;

  @ApiPropertyOptional({ example: 'Custom wall photos for your home' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({ example: 'parent-category-uuid' })
  @IsOptional()
  @IsString()
  parentId?: string;

  @ApiPropertyOptional({ example: 'https://cdn.ikonnic.com/categories/wall-photos.webp' })
  @IsOptional()
  @IsString()
  image?: string;

  @ApiPropertyOptional({ example: '#e11d48', description: 'Accent colour hex' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  accent?: string;

  @ApiPropertyOptional({ example: false, description: 'Show on the homepage featured strip' })
  @IsOptional()
  @IsBoolean()
  featured?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateCategoryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  slug?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  parentId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  image?: string;

  @ApiPropertyOptional({ example: '#e11d48' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  accent?: string;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  featured?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

// ─── Coupons ─────────────────────────────────────────────────────────

export class CreateCouponDto {
  @ApiProperty({ example: 'SUMMER20' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  code: string;

  @ApiPropertyOptional({ example: '20% off on summer collection' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiProperty({ enum: ['PERCENTAGE', 'FLAT'] })
  @IsString()
  @IsEnum(['PERCENTAGE', 'FLAT'])
  discountType: string;

  @ApiProperty({ example: 20 })
  @IsNumber()
  @Min(0)
  discountValue: number;

  @ApiPropertyOptional({ example: 500, description: 'Max discount cap for percentage coupons' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxDiscount?: number;

  @ApiPropertyOptional({ example: 1000, description: 'Minimum order amount to use coupon' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minOrderAmount?: number;

  @ApiPropertyOptional({ example: 100, description: 'Total usage limit' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  usageLimit?: number;

  @ApiPropertyOptional({ example: 1, description: 'Per-user usage limit' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  perUserLimit?: number;

  @ApiPropertyOptional({ example: '2026-12-31T23:59:59.000Z' })
  @IsOptional()
  @IsString()
  validUntil?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateCouponDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(50)
  code?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ enum: ['PERCENTAGE', 'FLAT'] })
  @IsOptional()
  @IsString()
  @IsEnum(['PERCENTAGE', 'FLAT'])
  discountType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  discountValue?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxDiscount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  minOrderAmount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(1)
  usageLimit?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(1)
  perUserLimit?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  validUntil?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

// ─── Order Status ────────────────────────────────────────────────────

export class UpdateOrderStatusDto {
  @ApiProperty({ example: 'PRINTING', enum: OrderStatus })
  @IsEnum(OrderStatus, { message: `status must be one of: ${Object.values(OrderStatus).join(', ')}` })
  status: OrderStatus;

  @ApiPropertyOptional({ example: 'Order confirmed by admin' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

// ─── Inventory ───────────────────────────────────────────────────────

export class AdjustInventoryDto {
  @ApiPropertyOptional({ example: 50, description: 'Set absolute stock count' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  stockCount?: number;

  @ApiPropertyOptional({ example: -5, description: 'Relative stock delta (+/-)' })
  @IsOptional()
  @IsNumber()
  delta?: number;

  @ApiPropertyOptional({ example: 'Damaged items removed' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

// ─── Order Notes ─────────────────────────────────────────────────────

export class UpdateOrderNotesDto {
  @ApiPropertyOptional({ example: 'Customer requested gift wrap; artwork approved.' })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  internalNotes?: string;
}

// ─── User / Customer ─────────────────────────────────────────────────

export class UpdateUserStatusDto {
  @ApiProperty({ example: false, description: 'Activate or deactivate the account' })
  @IsBoolean()
  isActive: boolean;
}

// ─── Reviews ─────────────────────────────────────────────────────────

export class ModerateReviewDto {
  @ApiPropertyOptional({ example: true, description: 'Approve (publish) or hide the review' })
  @IsOptional()
  @IsBoolean()
  isApproved?: boolean;

  @ApiPropertyOptional({ example: 'Thanks for your feedback!' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  adminReply?: string;
}
