import { Controller, Post, Body, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { CouponsService } from './coupons.service';
import { ValidateCouponDto } from './dto/validate-coupon.dto';

@ApiTags('coupons')
@Controller('coupons')
export class CouponsController {
  constructor(private readonly couponsService: CouponsService) {}

  @Post('validate')
  @ApiOperation({ summary: 'Validate a coupon code' })
  async validate(@Body() body: ValidateCouponDto, @Req() req: any) {
    return this.couponsService.validateCoupon(body.code, body.cartTotal, req?.user?.id);
  }
}
