import { IsString, IsNotEmpty, IsNumber, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ValidateCouponDto {
  @ApiProperty({ example: 'SAVE10', description: 'Coupon code to validate' })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({ example: 1500, description: 'Cart total in rupees' })
  @IsNumber()
  @Min(0)
  cartTotal: number;
}
